frappe.ui.form.on("Quotation", {
	refresh: function(frm) {
		render_commercial_actions(frm);
	},
	management_fee_pct: function(frm) {
		recalc_totals(frm);
	},
	vat_rate_applied: function(frm) {
		recalc_totals(frm);
	}
});

frappe.ui.form.on("Quotation Item", {
	qty: function(frm) { recalc_totals(frm); },
	rate: function(frm) { recalc_totals(frm); }
});

function recalc_totals(frm) {
	let subtotal = 0;
	(frm.doc.items || []).forEach(it => {
		let amt = flt(it.qty) * flt(it.rate);
		it.amount = amt;
		subtotal += amt;
	});

	let fee_pct = flt(frm.doc.management_fee_pct || 0) / 100.0;
	let fee_amt = flt(subtotal * fee_pct, 2);
	let net_total = flt(subtotal + fee_amt, 2);

	let vat_pct = flt(frm.doc.vat_rate_applied || 0) / 100.0;
	let vat_amt = flt(net_total * vat_pct, 2);
	let grand_total = flt(net_total + vat_amt, 2);

	frm.set_value("items_subtotal", subtotal);
	frm.set_value("management_fee_amount", fee_amt);
	frm.set_value("net_total_before_vat", net_total);
	frm.set_value("vat_amount", vat_amt);
	frm.set_value("grand_total", grand_total);
	frm.set_value("rounded_total", grand_total);

	(frm.doc.milestones || []).forEach(m => {
		m.amount = flt(grand_total * (flt(m.percentage) / 100.0), 2);
	});
	frm.refresh_field("milestones");
}

function render_commercial_actions(frm) {
	if (frm.is_new()) return;

	let status = frm.doc.approval_status || "Draft";
	if (status === "Draft") {
		frm.add_custom_button(__("Submit for Approval"), function() {
			frappe.call({
				method: "trending_commercial.trending_commercial.api.quotation.submit_quotation_for_approval",
				args: { quotation_name: frm.doc.name },
				callback: function(r) {
					frappe.msgprint(r.message.message);
					frm.reload_doc();
				}
			}).addClass("btn-warning");
		});
	} else if (status === "Pending Approval") {
		if (frappe.user_roles.includes("System Manager") || frappe.user_roles.includes("Commercial Director")) {
			frm.add_custom_button(__("Approve Quotation"), function() {
				frappe.call({
					method: "trending_commercial.trending_commercial.api.quotation.approve_quotation",
					args: { quotation_name: frm.doc.name },
					callback: function(r) {
						frappe.msgprint(r.message.message);
						frm.reload_doc();
					}
				}).addClass("btn-success");
			});
		}
	}
}
