import frappe
from frappe.utils import nowdate, getdate

@frappe.whitelist()
def get_dashboard_summary():
	"""Replicates the Trending CRM Dashboard state."""
	user = frappe.session.user
	user_doc = frappe.get_cached_doc("User", user)
	first_name = user_doc.first_name or "there"

	# KPI metrics
	open_briefs = frappe.db.count("Commercial Brief", {"status": ["not in", ["Won", "Lost"]]})
	active_projects = frappe.db.count("Project", {"status": "Open"})
	pending_quotes = frappe.db.count("Quotation", {"approval_status": "Pending Approval"})
	approved_quotes = frappe.db.count("Quotation", {"approval_status": "Approved"})

	# Status distribution of Briefs
	briefs_by_status = frappe.db.get_all(
		"Commercial Brief",
		fields=["status", "count(name) as count"],
		group_by="status"
	)

	# Active projects list
	projects = frappe.db.get_all(
		"Project",
		filters={"status": "Open"},
		fields=["name", "project_name", "customer", "expected_end_date", "status"],
		order_by="creation desc",
		limit=6
	)

	# Recent activity log
	activity_list = frappe.db.get_all(
		"Activity Log",
		fields=["subject", "user", "creation"],
		order_by="creation desc",
		limit=6
	)

	return {
		"first_name": first_name,
		"today": nowdate(),
		"metrics": {
			"open_briefs": open_briefs,
			"active_projects": active_projects,
			"pending_quotes": pending_quotes,
			"approved_quotes": approved_quotes
		},
		"briefs_by_status": {r["status"]: r["count"] for r in briefs_by_status},
		"active_projects": projects,
		"recent_activity": activity_list
	}
