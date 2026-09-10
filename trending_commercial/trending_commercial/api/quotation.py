import frappe
from frappe import _
from frappe.utils import flt, round_based_on_smallest_currency_fraction, nowdate

SERVICE_ITEM_CODE = "TRENDING-COMMERCIAL-SERVICE"

def ensure_default_service_item():
	"""Ensure standard non-stock service item exists so freeform items map correctly to COGS."""
	if not frappe.db.exists("Item", SERVICE_ITEM_CODE):
		item = frappe.get_doc({
			"doctype": "Item",
			"item_code": SERVICE_ITEM_CODE,
			"item_name": "Trending Commercial Custom Service",
			"item_group": "Services" if frappe.db.exists("Item Group", "Services") else "All Item Groups",
			"is_stock_item": 0,
			"is_sales_item": 1,
			"is_purchase_item": 1,
			"stock_uom": "Nos"
		})
		item.insert(ignore_permissions=True)
		frappe.db.commit()
	return SERVICE_ITEM_CODE

@frappe.whitelist()
def create_quotation_from_costing(costing_sheet_name):
	costing = frappe.get_doc("Commercial Costing Sheet", costing_sheet_name)
	ensure_default_service_item()

	quotation = frappe.new_doc("Quotation")
	quotation.quotation_to = "Customer"
	quotation.party_name = costing.customer
	quotation.commercial_brief = costing.commercial_brief
	quotation.costing_sheet = costing.name
	quotation.project = costing.project
	quotation.transaction_date = nowdate()
	quotation.approval_status = "Draft"

	# Pull settings
	settings = frappe.get_single("Commercial Settings") if frappe.db.exists("DocType", "Commercial Settings") else None
	quotation.management_fee_pct = flt(getattr(settings, "default_management_fee_pct", 15.0) or 15.0)
	quotation.vat_rate_applied = flt(getattr(settings, "default_vat_rate_pct", 14.0) or 14.0)

	# Pull metadata from Brief if available
	if costing.commercial_brief:
		brief = frappe.get_doc("Commercial Brief", costing.commercial_brief)
		quotation.project_name = brief.title
		quotation.event_start_date = brief.expected_date

	for line in costing.get("items") or []:
		quotation.append("items", {
			"item_code": SERVICE_ITEM_CODE,
			"item_name": line.item_label,
			"description": line.description or line.item_label,
			"qty": flt(line.quantity or 1.0),
			"rate": flt(line.selling_rate or 0.0),
			"uom": "Nos"
		})

	# Default milestones: 60% advance, 40% delivery
	quotation.append("milestones", {
		"label": "Advance Payment (Down Payment)",
		"percentage": 60.0,
		"trigger_text": "With official PO / signed agreement"
	})
	quotation.append("milestones", {
		"label": "Final Balance Payment",
		"percentage": 40.0,
		"trigger_text": "Within 7 days of event delivery / completion"
	})

	calculate_quotation_commercial_totals(quotation)
	quotation.insert(ignore_permissions=True)
	return quotation.name

def calculate_quotation_commercial_totals(doc, method=None, *args, **kwargs):
	"""Exact mathematical model from Trending CRM lib/quote.ts:
	Subtotal = Sum(Qty * Rate)
	Management Fee = Subtotal * fee_pct
	Net Total = Subtotal + Management Fee
	VAT = Net Total * vat_rate
	Grand Total = Net Total + VAT
	"""
	subtotal = 0.0
	for it in doc.get("items") or []:
		it.amount = flt(flt(it.qty) * flt(it.rate), 2)
		subtotal += it.amount

	fee_pct = flt(doc.get("management_fee_pct") or 0.0) / 100.0
	fee_amount = flt(subtotal * fee_pct, 2)
	net_total = flt(subtotal + fee_amount, 2)

	vat_pct = flt(doc.get("vat_rate_applied") or 0.0) / 100.0
	vat_amount = flt(net_total * vat_pct, 2)
	grand_total = flt(net_total + vat_amount, 2)

	doc.items_subtotal = subtotal
	doc.management_fee_amount = fee_amount
	doc.net_total_before_vat = net_total
	doc.vat_amount = vat_amount
	doc.grand_total = grand_total
	doc.rounded_total = grand_total

	# Calculate milestone amounts
	for m in doc.get("milestones") or []:
		pct = flt(m.percentage or 0.0) / 100.0
		m.amount = flt(grand_total * pct, 2)

@frappe.whitelist()
def submit_quotation_for_approval(quotation_name):
	doc = frappe.get_doc("Quotation", quotation_name)
	settings = frappe.get_single("Commercial Settings")
	total = flt(doc.grand_total)

	t1 = flt(getattr(settings, "tier_1_limit", 10000))
	t2 = flt(getattr(settings, "tier_2_limit", 50000))
	t3 = flt(getattr(settings, "tier_3_limit", 1000000))

	if total <= t1:
		doc.approval_status = "Approved"
		doc.approved_by_user = frappe.session.user
		msg = _("Approved automatically under Tier 1 limit.")
	else:
		doc.approval_status = "Pending Approval"
		msg = _("Quotation submitted for management sign-off.")

	doc.save(ignore_permissions=True)
	return {"status": doc.approval_status, "message": msg}

@frappe.whitelist()
def approve_quotation(quotation_name):
	doc = frappe.get_doc("Quotation", quotation_name)
	doc.approval_status = "Approved"
	doc.approved_by_user = frappe.session.user
	doc.save(ignore_permissions=True)
	return {"status": "Approved", "message": _("Quotation has been successfully approved.")}

def quotation_before_print(doc, method=None, *args, **kwargs):
	"""Server-side PDF and print restriction enforced."""
	if doc.doctype == "Quotation" and getattr(doc, "approval_status", "Draft") != "Approved":
		# Allow System Manager or Administrator to preview / print draft with watermark
		if "System Manager" not in frappe.get_roles():
			frappe.throw(_("Printing is disabled: This quotation is {0} and has not received final approval.").format(doc.approval_status))
