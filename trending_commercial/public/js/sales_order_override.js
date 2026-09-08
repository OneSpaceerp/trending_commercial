frappe.ui.form.on("Sales Order", {
	refresh: function(frm) {
		if (frm.doc.management_fee_amount) {
			frm.set_df_property("management_fee_amount", "description", __("Agency Fee from Quotation: {0}%", [frm.doc.management_fee_pct]));
		}
	}
});
