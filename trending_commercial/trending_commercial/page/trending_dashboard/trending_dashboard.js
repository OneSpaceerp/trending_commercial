frappe.pages['trending-dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Trending Hub',
		single_column: true
	});

	$(frappe.render_template("trending_dashboard", {})).appendTo(page.main);

	$("#btn-new-brief").on("click", function() {
		frappe.new_doc("Commercial Brief");
	});

	load_dashboard_data();
};

function load_dashboard_data() {
	frappe.call({
		method: "trending_commercial.trending_commercial.api.dashboard.get_dashboard_summary",
		callback: function(r) {
			if (r.message) {
				let d = r.message;
				$("#hub-user-name").text(d.first_name);
				$("#val-open-briefs").text(d.metrics.open_briefs);
				$("#val-active-projects").text(d.metrics.active_projects);
				$("#val-pending-quotes").text(d.metrics.pending_quotes);
				$("#val-approved-quotes").text(d.metrics.approved_quotes);

				let p_html = "";
				if ((d.active_projects || []).length === 0) {
					p_html = "<tr><td colspan='4' class='text-center text-muted'>No active projects.</td></tr>";
				} else {
					d.active_projects.forEach(p => {
						p_html += `<tr>
							<td><a href="/app/project/${p.name}"><b>${frappe.utils.escape_html(p.project_name || p.name)}</b></a></td>
							<td>${frappe.utils.escape_html(p.customer || "-")}</td>
							<td>${frappe.datetime.str_to_user(p.expected_end_date) || "-"}</td>
							<td><span class="badge badge-success">${p.status}</span></td>
						</tr>`;
					});
				}
				$("#tbl-projects-body").html(p_html);

				let a_html = "";
				if ((d.recent_activity || []).length === 0) {
					a_html = "<div class='text-muted p-2'>No recent activity logged.</div>";
				} else {
					d.recent_activity.forEach(a => {
						a_html += `<div class="activity-feed-item">
							<div><b>${frappe.utils.escape_html(a.user)}</b> ${frappe.utils.escape_html(a.subject || "performed an action")}</div>
							<div class="activity-time">${frappe.datetime.comment_when(a.creation)}</div>
						</div>`;
					});
				}
				$("#activity-feed-list").html(a_html);
			}
		}
	});
}
