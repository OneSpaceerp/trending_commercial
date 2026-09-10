app_name = "trending_commercial"
app_title = "Trending Commercial"
app_publisher = "Trending Experiential"
app_description = "ERPNext v16 Commercial Operations, Costing, Dynamic Briefs, and Quotation Management"
app_email = "tech@trending-mena.com"
app_license = "mit"

# Includes in <head>
# ------------------
# include js, css files in header of desk.html
app_include_css = "/assets/trending_commercial/css/trending_theme.css"

# DocType Javascript
# ------------------
doctype_js = {
	"Quotation": "public/js/quotation_override.js",
	"Sales Order": "public/js/sales_order_override.js"
}

# Document Events
# ---------------
doc_events = {
	"Quotation": {
		"validate": "trending_commercial.trending_commercial.api.quotation.calculate_quotation_commercial_totals"
	}
}

# Fixtures
# --------
fixtures = [
	{
		"dt": "Custom Field",
		"filters": [["dt", "in", ["Quotation", "Sales Order", "Project", "Sales Invoice"]]]
	}
]
