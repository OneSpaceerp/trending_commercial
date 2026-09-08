import frappe
from frappe.model.document import Document

class CommercialCostingSheet(Document):
	def validate(self):
		self.calculate_totals()
		self.sync_brief_data()

	def sync_brief_data(self):
		if self.commercial_brief:
			brief = frappe.get_doc("Commercial Brief", self.commercial_brief)
			self.customer = brief.customer
			self.project = brief.project

	def calculate_totals(self):
		total_cost = 0.0
		total_selling = 0.0

		for row in self.get("items") or []:
			qty = float(row.quantity or 0)
			cost = float(row.unit_cost or 0)
			row.cost_total = round(qty * cost, 2)
			total_cost += row.cost_total

			margin = float(row.margin_pct or 0)
			# Selling price based on margin %: cost / (1 - margin/100)
			if margin < 100:
				row.selling_rate = round(cost / (1 - (margin / 100.0)), 2)
			else:
				row.selling_rate = round(cost * 2, 2)

			row.selling_total = round(qty * row.selling_rate, 2)
			total_selling += row.selling_total

		self.total_cost = total_cost
		self.total_selling = total_selling
		if total_selling > 0:
			self.projected_margin_pct = round(((total_selling - total_cost) / total_selling) * 100, 2)
		else:
			self.projected_margin_pct = 0.0

@frappe.whitelist()
def make_quotation_from_costing(costing_sheet_name):
	from trending_commercial.trending_commercial.api.quotation import create_quotation_from_costing
	return create_quotation_from_costing(costing_sheet_name)
