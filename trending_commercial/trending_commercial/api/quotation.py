import frappe
from frappe import _
from frappe.utils import flt, round_based_on_smallest_currency_fraction, nowdate

SERVICE_ITEM_CODE = "TRENDING-COMMERCIAL-SERVICE"
MANAGEMENT_FEE_ITEM_CODE = "MANAGEMENT-FEE"

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

def ensure_management_fee_item():
	"""Ensure standard non-stock agency / management fee item exists."""
	if not frappe.db.exists("Item", MANAGEMENT_FEE_ITEM_CODE):
		existing = frappe.db.get_value("Item", {"item_name": "Agency / Management Fee"}, "name")
		if existing:
			return existing
		try:
			item = frappe.get_doc({
				"doctype": "Item",
				"item_code": MANAGEMENT_FEE_ITEM_CODE,
				"item_name": "Agency / Management Fee",
				"item_group": "Services" if frappe.db.exists("Item Group", "Services") else "All Item Groups",
				"is_stock_item": 0,
				"is_sales_item": 1,
				"is_purchase_item": 0,
				"stock_uom": "Nos",
				"description": "Agency / Management Fee"
			})
			item.insert(ignore_permissions=True)
			frappe.db.commit()
		except Exception as e:
			frappe.log_error(f"Error creating management fee item: {e}", "Trending Commercial")
	return MANAGEMENT_FEE_ITEM_CODE

def setup_commercial_defaults():
	"""Ensures default service and management fee items exist during migrate."""
	ensure_default_service_item()
	ensure_management_fee_item()

def get_vat_account(company="Trending"):
	"""Retrieve the standard VAT tax account [2311 - VAT - T] for the company."""
	if frappe.db.exists("Account", "2311 - VAT - T"):
		return "2311 - VAT - T"
	acct = frappe.db.get_value("Account", {"account_number": "2311", "company": company, "is_group": 0}, "name")
	if acct:
		return acct
	acct = frappe.db.get_value("Account", {"account_name": ["like", "%VAT%"], "company": company, "is_group": 0}, "name")
	if acct:
		return acct
	return "2311 - VAT - T"

def is_management_fee_item(item):
	if not item:
		return False
	code = (item.get("item_code") or "").strip().upper()
	name = (item.get("item_name") or "").strip().lower()
	desc = (item.get("description") or "").strip().lower()
	if code in ["MANAGEMENT-FEE", "MANAGEMENT_FEE", "MANAGEMENT FEES"]:
		return True
	if "agency" in name and "fee" in name:
		return True
	if "management" in name and "fee" in name:
		return True
	if "agency / management fee" in desc:
		return True
	return False

def is_vat_tax_row(tax_row, vat_account):
	if not tax_row:
		return False
	head = (tax_row.get("account_head") or "").strip()
	desc = (tax_row.get("description") or "").strip().upper()
	if head == vat_account:
		return True
	if "2311" in head or "VAT" in head.upper() or "VAT" in desc:
		return True
	return False

@frappe.whitelist()
def create_quotation_from_costing(costing_sheet_name):
	costing = frappe.get_doc("Commercial Costing Sheet", costing_sheet_name)
	ensure_default_service_item()
	ensure_management_fee_item()

	quotation = frappe.new_doc("Quotation")
	quotation.quotation_to = "Customer"
	quotation.party_name = costing.customer
	quotation.commercial_brief = costing.commercial_brief
	quotation.costing_sheet = costing.name
	quotation.project = costing.project
	quotation.transaction_date = nowdate()
	quotation.approval_status = "Draft"
	quotation.company = costing.get("company") or "Trending"

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
	"""
	Calculates Quotation totals adhering to user specifications:
	1. 'Agency / Management Fee' is added as a real line item in doc.items, calculated from management_fee_pct.
	2. 'VAT Rate Applied' is added to the taxes table under account [2311 - VAT - T] with the specified percentage.
	3. Standard ERPNext totals (net_total, total_taxes_and_charges, grand_total) are recalculated natively.
	4. Commercial summary fields and milestones are kept in sync.
	"""
	# 1. Operational subtotal (all items except Agency / Management Fee item)
	base_subtotal = 0.0
	for it in doc.get("items") or []:
		if not is_management_fee_item(it):
			it.amount = flt(flt(it.qty) * flt(it.rate), 2)
			base_subtotal += it.amount
	base_subtotal = flt(base_subtotal, 2)

	fee_pct = flt(doc.get("management_fee_pct") or 0.0)
	fee_amount = flt(base_subtotal * (fee_pct / 100.0), 2)

	# 2. Add / update Agency / Management Fee item in items table
	fee_rows = [it for it in doc.get("items") or [] if is_management_fee_item(it)]
	if fee_pct > 0:
		fee_item_code = ensure_management_fee_item()
		if fee_rows:
			fee_row = fee_rows[0]
			fee_row.item_code = fee_item_code
			fee_row.item_name = "Agency / Management Fee"
			fee_row.description = f"Agency / Management Fee ({fee_pct}%)"
			fee_row.qty = 1.0
			fee_row.rate = fee_amount
			fee_row.amount = fee_amount
			fee_row.uom = fee_row.uom or "Nos"
			fee_row.stock_uom = fee_row.stock_uom or "Nos"
			fee_row.conversion_factor = 1.0
			for extra in fee_rows[1:]:
				doc.remove(extra)
		else:
			doc.append("items", {
				"item_code": fee_item_code,
				"item_name": "Agency / Management Fee",
				"description": f"Agency / Management Fee ({fee_pct}%)",
				"qty": 1.0,
				"rate": fee_amount,
				"amount": fee_amount,
				"uom": "Nos",
				"stock_uom": "Nos",
				"conversion_factor": 1.0
			})
	else:
		for r in fee_rows:
			doc.remove(r)
		fee_amount = 0.0

	# 3. Add / update VAT Tax Row in taxes table under [2311 - VAT - T]
	company = doc.get("company") or "Trending"
	vat_account = get_vat_account(company)
	vat_rate = flt(doc.get("vat_rate_applied") or 0.0)
	vat_rows = [t for t in doc.get("taxes") or [] if is_vat_tax_row(t, vat_account)]

	if vat_rate > 0:
		if vat_rows:
			vrow = vat_rows[0]
			vrow.charge_type = "On Net Total"
			vrow.account_head = vat_account
			vrow.rate = vat_rate
			vrow.description = f"VAT {vat_rate}%"
			for extra in vat_rows[1:]:
				doc.remove(extra)
		else:
			tax_dict = {
				"charge_type": "On Net Total",
				"account_head": vat_account,
				"rate": vat_rate,
				"description": f"VAT {vat_rate}%"
			}
			cost_center = doc.get("cost_center") or frappe.db.get_value("Company", company, "cost_center")
			if cost_center:
				tax_dict["cost_center"] = cost_center
			doc.append("taxes", tax_dict)
	else:
		for r in vat_rows:
			doc.remove(r)

	# 4. Trigger ERPNext native calculation engine
	if hasattr(doc, "calculate_taxes_and_totals"):
		try:
			doc.calculate_taxes_and_totals()
		except Exception as e:
			frappe.log_error(f"calculate_taxes_and_totals error: {e}", "Trending Commercial")

	# 5. Populate commercial summary custom fields
	net_total = flt(base_subtotal + fee_amount, 2)
	vat_amount = flt(doc.get("total_taxes_and_charges") or (net_total * (vat_rate / 100.0)), 2)
	grand_total = flt(doc.get("grand_total") or (net_total + vat_amount), 2)

	doc.items_subtotal = base_subtotal
	doc.management_fee_amount = fee_amount
	doc.net_total_before_vat = net_total
	doc.vat_amount = vat_amount
	doc.total = flt(doc.get("total") or net_total, 2)
	doc.net_total = flt(doc.get("net_total") or net_total, 2)
	doc.total_taxes_and_charges = vat_amount
	doc.grand_total = grand_total
	doc.rounded_total = grand_total

	# 6. Recalculate milestone amounts
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
