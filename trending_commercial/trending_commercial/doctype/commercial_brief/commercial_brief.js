frappe.ui.form.on("Commercial Brief", {
	refresh: function(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("Create Costing Sheet"), function() {
				frappe.call({
					method: "trending_commercial.trending_commercial.doctype.commercial_brief.commercial_brief.create_costing_from_brief",
					args: { brief_name: frm.doc.name },
					callback: function(r) {
						if (r.message) {
							frappe.set_route("Form", "Commercial Costing Sheet", r.message);
						}
					}
				}).addClass("btn-primary");
			});
		}
		render_answers_summary(frm);
	},
	vertical: function(frm) {
		update_subdomains(frm);
	},
	answers_json: function(frm) {
		render_answers_summary(frm);
	}
});

const SUBDOMAINS_BY_VERTICAL = {
	"EVENTS": [
		{ value: "sports", label: "Sports" },
		{ value: "entertainment", label: "Entertainment" },
		{ value: "business", label: "Business" },
		{ value: "launch", label: "Launch Events" }
	],
	"EMPLOYEE_EXPERIENCE": [
		{ value: "indoor", label: "Indoor Experience" },
		{ value: "team_building", label: "Team Building" },
		{ value: "outings_travel", label: "Outings & Travel" },
		{ value: "catering", label: "Catering" }
	],
	"BTL_ADVERTISING": [
		{ value: "road_shows", label: "Road Shows" },
		{ value: "trade_marketing", label: "Trade Marketing" },
		{ value: "booth_production", label: "Booth Production" },
		{ value: "brand_activation", label: "Brand Activation" }
	],
	"VENDORING_PRODUCTION": [
		{ value: "branding_production", label: "Branding / Production" },
		{ value: "giveaways", label: "Giveaways" },
		{ value: "payment_service", label: "Payment Service" }
	]
};

function update_subdomains(frm) {
	let v = frm.doc.vertical;
	let options = SUBDOMAINS_BY_VERTICAL[v] || [];
	let opt_strings = options.map(o => o.value).join("\n");
	frm.set_df_property("sub_domain", "options", opt_strings);
	if (options.length > 0) {
		frm.set_value("sub_domain", options[0].value);
	}
}

function render_answers_summary(frm) {
	if (!frm.doc.answers_json) {
		frm.get_field("answers_html").$wrapper.html("<div class='text-muted p-2'>No detailed questionnaire answers submitted.</div>");
		return;
	}
	try {
		let data = JSON.parse(frm.doc.answers_json);
		let html = "<div class='table-responsive'><table class='table table-bordered table-sm'>";
		html += "<thead class='thead-light'><tr><th style='width:35%'>Question</th><th>Answer</th></tr></thead><tbody>";
		for (let k of Object.keys(data)) {
			let val = data[k];
			if (Array.isArray(val)) val = val.join(", ");
			html += `<tr><td><b>${frappe.utils.escape_html(k)}</b></td><td>${frappe.utils.escape_html(String(val))}</td></tr>`;
		}
		html += "</tbody></table></div>";
		frm.get_field("answers_html").$wrapper.html(html);
	} catch (e) {
		frm.get_field("answers_html").$wrapper.html("<div class='text-muted p-2'>Invalid JSON answers format.</div>");
	}
}
