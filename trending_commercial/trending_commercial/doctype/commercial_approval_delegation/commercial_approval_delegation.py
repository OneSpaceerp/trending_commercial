import frappe
from frappe.model.document import Document
from frappe.utils import nowdate, getdate

class CommercialApprovalDelegation(Document):
	def validate(self):
		if getdate(self.to_date) < getdate(self.from_date):
			frappe.throw("To Date cannot be earlier than From Date.")
