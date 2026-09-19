import frappe
from frappe.model.document import Document
import json

class CommercialBrief(Document):
	def validate(self):
		self.ensure_project()

	def ensure_project(self):
		"""Automatically instantiate an ERPNext Project linked to this Brief."""
		if not self.project and self.customer and self.title:
			cust_name = frappe.db.get_value("Customer", self.customer, "customer_name") or self.customer
			project_name = f"{cust_name} - {self.title}"
			
			# Check if project already exists
			existing = frappe.db.get_value("Project", {"project_name": project_name}, "name")
			if existing:
				self.project = existing
			else:
				proj = frappe.get_doc({
					"doctype": "Project",
					"project_name": project_name,
					"customer": self.customer,
					"status": "Open",
					"notes": f"Commercial Brief {self.name}: {self.description or ''}"
				})
				proj.insert(ignore_permissions=True)
				self.project = proj.name

@frappe.whitelist()
def create_costing_from_brief(brief_name):
	brief = frappe.get_doc("Commercial Brief", brief_name)
	costing = frappe.get_doc({
		"doctype": "Commercial Costing Sheet",
		"title": f"Costing - {brief.title}",
		"commercial_brief": brief.name,
		"customer": brief.customer,
		"project": brief.project,
		"status": "Draft",
		"items": [
			{
				"category": "Production",
				"item_label": brief.title or "Operational Costing Line",
				"description": f"Costing line for {brief.title}",
				"quantity": 1.0,
				"unit_cost": 0.0,
				"margin_pct": 25.0
			}
		]
	})
	costing.insert(ignore_permissions=True, ignore_mandatory=True)
	return costing.name
