frappe.ui.form.on("Commercial Costing Sheet", {
	refresh: function(frm) {
		if (frm.doc.docstatus === 1 || frm.doc.status === "Approved") {
			frm.add_custom_button(__("Create Quotation"), function() {
				frappe.call({
					method: "trending_commercial.trending_commercial.doctype.commercial_costing_sheet.commercial_costing_sheet.make_quotation_from_costing",
					args: { costing_sheet_name: frm.doc.name },
					freeze: true,
					freeze_message: __("Building Quotation..."),
					callback: function(r) {
						if (r.message) {
							frappe.set_route("Form", "Quotation", r.message);
						}
					}
				});
			}).addClass("btn-primary");
		}
	}
});

frappe.ui.form.on("Commercial Costing Line", {
	quantity: function(frm, cdt, cdn) { calculate_line(frm, cdt, cdn); },
	unit_cost: function(frm, cdt, cdn) { calculate_line(frm, cdt, cdn); },
	margin_pct: function(frm, cdt, cdn) { calculate_line(frm, cdt, cdn); },
});

function calculate_line(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	let qty = flt(row.quantity);
	let cost = flt(row.unit_cost);
	let margin = flt(row.margin_pct);

	row.cost_total = flt(qty * cost, 2);
	if (margin < 100) {
		row.selling_rate = flt(cost / (1 - (margin / 100.0)), 2);
	} else {
		row.selling_rate = flt(cost * 2, 2);
	}
	row.selling_total = flt(qty * row.selling_rate, 2);
	frm.refresh_field("items");

	// Trigger header recalc
	let t_cost = 0;
	let t_selling = 0;
	(frm.doc.items || []).forEach(r => {
		t_cost += flt(r.cost_total);
		t_selling += flt(r.selling_total);
	});
	frm.set_value("total_cost", t_cost);
	frm.set_value("total_selling", t_selling);
	if (t_selling > 0) {
		frm.set_value("projected_margin_pct", flt(((t_selling - t_cost) / t_selling) * 100, 2));
	}
}
