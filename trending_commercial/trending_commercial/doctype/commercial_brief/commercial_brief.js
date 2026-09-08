// Trending Commercial Brief - Dynamic Wizard matching Trending CRM Request Form
frappe.ui.form.on('Commercial Brief', {
	refresh: function(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__('Create Costing Sheet'), function() {
				frappe.call({
					method: 'trending_commercial.trending_commercial.doctype.commercial_brief.commercial_brief.create_costing_from_brief',
					args: { brief_name: frm.doc.name },
					callback: function(r) {
						if (r.message) {
							frappe.set_route('Form', 'Commercial Costing Sheet', r.message);
						}
					}
				}).addClass('btn-primary');
			});
		}
		render_brief_wizard(frm);
	},
	vertical: function(frm) {
		render_brief_wizard(frm);
	},
	sub_domain: function(frm) {
		render_brief_wizard(frm);
	},
	customer: function(frm) {
		render_brief_wizard(frm);
	}
});

// Dynamic brief questions specification directly ported from Trending CRM lib/brief.ts
const GENERAL_QUESTIONS = [
	{ id: 'objective', label: 'Main objective', type: 'multi',
	  options: ['Awareness', 'Engagement', 'Sales', 'Internal comms', 'Celebration', 'Attendance', 'PR coverage', 'Experience', 'Other'] },
	{ id: 'audience', label: 'Target audience', type: 'long', hint: 'age, gender, class A+→D, behaviour, formal/fun/family/corporate' },
	{ id: 'tone', label: 'Desired tone', type: 'multi', options: ['Serious', 'Modern', 'Energetic', 'Premium', 'Friendly'] },
	{ id: 'budget', label: 'Client budget (EGP)', type: 'number', hint: 'their stated budget, if any' },
	{ id: 'constraints', label: 'Constraints / not acceptable', type: 'long', hint: 'messages, themes, colours, banned suppliers, budget caps' }
];

const MODULE_TOGGLES = [
	{ id: 'mod_catering', label: 'Catering needed?', type: 'yesno' },
	{ id: 'mod_production', label: 'Branding & production needed?', type: 'yesno' },
	{ id: 'mod_giveaways', label: 'Giveaways needed?', type: 'yesno' }
];

const VERTICALS = [
	{
		key: 'EVENTS',
		label: 'Events',
		shared: [
			{ id: 'ev_attendees', label: 'Number of attendees', type: 'select', options: ['<50', '50–150', '150–500', '>500'] },
			{ id: 'ev_duration', label: 'Duration', type: 'select', options: ['2–4 hours', 'Full day', 'Two days', 'More'] },
			{ id: 'ev_venue', label: 'Venue', type: 'select', options: ['Hall', 'Mall', 'Outdoor', 'Hotel', 'Dedicated venue', 'Recommend for us'] },
			{ id: 'ev_venue_by', label: 'Venue secured by', type: 'select', options: ['Client', 'Us (agency)'] },
			{ id: 'ev_tech', label: 'Technical needs', type: 'multi', options: ['Sound', 'Lighting', 'LED screens', 'Stage', 'Decoration', 'Booths', 'Activities', 'None'] },
			{ id: 'ev_manpower', label: 'Manpower', type: 'multi', options: ['Reception', 'Organizers', 'Security', 'Technicians', 'Photographers', 'MC', 'DJ', 'Ushers', 'Medics', 'None'] },
			...MODULE_TOGGLES,
			{ id: 'ev_notes', label: 'Notes', type: 'long' }
		],
		subDomains: [
			{ key: 'sports', label: 'Sports', questions: [
				{ id: 'sp_type', label: 'Sport type', type: 'multi', options: ['Football league', 'Football cup', 'Padel tournament', 'Mini Olympics', 'Marathon', 'Cycling race', 'Esports', 'Other'] },
				{ id: 'sp_purpose', label: 'Purpose', type: 'multi', options: ['Competition', 'Activation', 'Awareness', 'Community engagement', 'Gaming experience', 'Corporate sports day', 'Sports festival'] },
				{ id: 'sp_profile', label: 'Participant profile', type: 'multi', options: ['Professional', 'Casual', 'Students', 'Employees', 'General public', 'Families', 'Mixed'] },
				{ id: 'sp_equipment', label: 'Equipment', type: 'multi', options: ['PS', 'PC', 'Screens', 'Internet', 'Sports equipment', 'Bean bags', 'Tools'] },
				{ id: 'sp_officials', label: 'Officials', type: 'multi', options: ['Referees', 'Commentator', 'Tournament manager', 'Ushers', 'Medics', 'First-aid unit', 'Security', 'None'] }
			] },
			{ key: 'entertainment', label: 'Entertainment', questions: [
				{ id: 'en_purpose', label: 'Purpose', type: 'multi', options: ['Branding', 'Awareness', 'Entertainment', 'Launch', 'Corporate gathering', 'Community engagement'] },
				{ id: 'en_activities', label: 'Activities / entertainment', type: 'long', hint: 'shows, DJ, activities, talent' }
			] },
			{ key: 'business', label: 'Business', questions: [
				{ id: 'bu_kind', label: 'Event kind', type: 'select', options: ['Office opening', 'Annual event', 'Cycle meeting', 'Conference', 'Seminar', 'Recognition', 'Office celebration'] },
				{ id: 'bu_agenda', label: 'Agenda & content', type: 'long', hint: '# sessions, speakers/keynotes, timing, workshops' },
				{ id: 'bu_catering', label: 'Catering', type: 'multi', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Buffet', 'Coffee break', 'Set menu'] }
			] },
			{ key: 'launch', label: 'Launch Events', questions: [
				{ id: 'la_type', label: 'Launch type', type: 'select', options: ['Product launch', 'Brand launch', 'Service launch', 'Store/branch opening', 'Rebrand reveal'] },
				{ id: 'la_what', label: 'What is being launched', type: 'text' },
				{ id: 'la_reveal', label: 'Reveal mechanic / concept', type: 'long', hint: 'countdown, unveiling, teaser' },
				{ id: 'la_press', label: 'Press / media & PR coverage?', type: 'yesno' },
				{ id: 'la_vip', label: 'VIP / key guests', type: 'long' },
				{ id: 'la_demo', label: 'Product display or demo?', type: 'yesno' },
				{ id: 'la_teaser', label: 'Teaser / pre-launch campaign?', type: 'yesno' },
				{ id: 'la_stage', label: 'Stage & show elements', type: 'multi', options: ['Stage', 'LED', 'Sound', 'Lighting', 'Special effects', 'Live show', 'Host-MC', 'None'] }
			] }
		]
	},
	{
		key: 'EMPLOYEE_EXPERIENCE',
		label: 'Employee Experience',
		subDomains: [
			{ key: 'indoor', label: 'Indoor Experience', questions: [
				{ id: 'in_type', label: 'Experience type', type: 'select', options: ['In-office activation', 'Small in-house event', 'Indoor entertainment', 'Seasonal celebration', 'Wellness day', 'Indoor family day', 'Other'] },
				{ id: 'in_location', label: 'Location', type: 'select', options: ['Client office', 'Our venue', 'External indoor venue'] },
				{ id: 'in_headcount', label: 'Headcount', type: 'number' },
				{ id: 'in_duration', label: 'Duration', type: 'select', options: ['Few hours', 'Half day', 'Full day', 'Multiple days'] },
				{ id: 'in_activities', label: 'Activities / setups', type: 'multi', options: ['Photo booth', 'Games corner', 'Workshops', 'Live stations', 'Entertainment', 'Decoration', 'Kids area', 'Other'] },
				{ id: 'in_catering', label: 'Catering needed?', type: 'yesno' },
				{ id: 'in_giveaways', label: 'Giveaways needed?', type: 'yesno' },
				{ id: 'in_notes', label: 'Notes', type: 'long' }
			] },
			{ key: 'team_building', label: 'Team Building', questions: [
				{ id: 'tb_location', label: 'Location', type: 'select', options: ['In Cairo — East', 'In Cairo — West', 'Outside Cairo'] },
				{ id: 'tb_objective', label: 'Objective', type: 'multi', options: ['Funday', 'Recognition', 'Team bonding'] },
				{ id: 'tb_headcount', label: 'Headcount', type: 'number' },
				{ id: 'tb_meals', label: 'Meals', type: 'multi', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'] },
				{ id: 'tb_package', label: 'Package', type: 'select', options: ['Bronze', 'Silver', 'Custom'] },
				{ id: 'tb_entertainment', label: 'Entertainment', type: 'multi', options: ['Photo booth', 'Caricature', 'Cookies decoration', 'Accessories workshop', 'Candy making', 'Painting', 'Face painting', 'Other'] },
				{ id: 'tb_sports', label: 'Sports / activities', type: 'multi', options: ['Basketball', 'Hammer game', 'Boxing', 'Other'] },
				{ id: 'tb_giveaways', label: 'Giveaways needed?', type: 'yesno' },
				{ id: 'tb_notes', label: 'Notes', type: 'long' }
			] },
			{ key: 'outings_travel', label: 'Outings & Travel', questions: [
				{ id: 'ot_trip', label: 'Trip type', type: 'select', options: ['Day use', 'Overnight stay'] },
				{ id: 'ot_room', label: 'Room type', type: 'select', options: ['Single', 'Double', 'Triple'] },
				{ id: 'ot_destination', label: 'Destination', type: 'text', hint: 'resort / chalet / …' },
				{ id: 'ot_facilities', label: 'Facilities', type: 'multi', options: ['Pool', 'Gym', 'Sea', 'Garden', 'Other'] },
				{ id: 'ot_meals', label: 'Meals', type: 'multi', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'] },
				{ id: 'ot_activities', label: 'Planned activities', type: 'long', hint: 'tours / workshops / free time; duration & timing' },
				{ id: 'ot_giveaways', label: 'Giveaways / T-shirts?', type: 'yesno' },
				{ id: 'ot_notes', label: 'Notes', type: 'long' }
			] },
			{ key: 'catering', label: 'Catering', questions: [
				{ id: 'ca_occasion', label: 'Occasion', type: 'select', options: ['Corporate', 'Celebration', 'Outdoor', 'Indoor'] },
				{ id: 'ca_cuisine', label: 'Cuisine', type: 'select', options: ['Local', 'International', 'Specific theme'] },
				{ id: 'ca_meals', label: 'Meals', type: 'multi', options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Buffet'] },
				{ id: 'ca_beverages', label: 'Beverages', type: 'multi', options: ['Soft drinks', 'Juices', 'Coffee', 'Tea'] },
				{ id: 'ca_service', label: 'Service style', type: 'select', options: ['Buffet', 'Plated', 'Live stations', 'Finger food', 'Food trucks'] },
				{ id: 'ca_venue_by', label: 'Venue provided by', type: 'select', options: ['Catering', 'Client'] },
				{ id: 'ca_logistics', label: 'Site logistics', type: 'long', hint: 'kitchen on-site? electricity/water? storage? delivery & setup time' },
				{ id: 'ca_headcount', label: 'Headcount', type: 'number' },
				{ id: 'ca_special', label: 'Special items (cakes/desserts/boxes)', type: 'long', hint: 'size, flavour, filling, design, packaging, references' },
				{ id: 'ca_notes', label: 'Notes', type: 'long' }
			] }
		]
	},
	{
		key: 'BTL_ADVERTISING',
		label: 'BTL Advertising',
		shared: [
			{ id: 'btl_objective', label: 'Campaign objective', type: 'multi', options: ['Awareness', 'Sampling', 'Lead generation', 'Product trial', 'Launch', 'Sales', 'Other'] },
			{ id: 'btl_promoters', label: 'Promoters & ushers', type: 'long', hint: 'how many, male/female, per location, skills, uniforms?' },
			{ id: 'btl_duration', label: 'Duration', type: 'text', hint: 'days / weeks' },
			{ id: 'btl_production', label: 'Branding & production?', type: 'yesno' },
			{ id: 'btl_giveaways', label: 'Giveaways?', type: 'yesno' },
			{ id: 'btl_kpis', label: 'Success metrics / KPIs', type: 'text', hint: 'visibility / store sales / footfall / samples / leads' },
			{ id: 'btl_client_loc', label: 'Client location involved?', type: 'yesno' },
			{ id: 'btl_notes', label: 'Notes', type: 'long' }
		],
		subDomains: [
			{ key: 'road_shows', label: 'Road Shows', questions: [
				{ id: 'rs_route', label: 'Route / cities', type: 'long', hint: 'list + sequence of stops' },
				{ id: 'rs_stops', label: '# stops · days per stop', type: 'text' },
				{ id: 'rs_setup', label: 'Mobile setup', type: 'multi', options: ['Truck', 'Trailer', 'Pop-up booth', 'Tent', 'Stage', 'None'] }
			] },
			{ key: 'trade_marketing', label: 'Trade Marketing', questions: [
				{ id: 'tm_channel', label: 'Retail channel', type: 'multi', options: ['Hypermarkets', 'Supermarkets', 'Pharmacies', 'Traditional trade', 'HORECA', 'Malls'] },
				{ id: 'tm_elements', label: 'In-store elements', type: 'multi', options: ['Gondola', 'Shelf branding', 'POSM', 'Sampling stand', 'Demo', 'Wobblers', 'Danglers'] },
				{ id: 'tm_coverage', label: 'Coverage (# stores)', type: 'number' },
				{ id: 'tm_merch', label: 'Merchandising / auditing?', type: 'yesno' }
			] },
			{ key: 'booth_production', label: 'Booth Production', questions: [
				{ id: 'bp_event', label: 'Exhibition / event name', type: 'text' },
				{ id: 'bp_area', label: 'Booth area (sqm)', type: 'number' },
				{ id: 'bp_type', label: 'Booth type', type: 'select', options: ['Shell scheme', 'Custom build', 'Modular', 'Double-deck'] },
				{ id: 'bp_design', label: 'Design', type: 'select', options: ['Provided by client', 'We design it'] },
				{ id: 'bp_elements', label: 'Booth elements', type: 'multi', options: ['Reception desk', 'Meeting area', 'Storage', 'Screens', 'Lighting', 'Shelving', 'Seating', 'Hanging banner'] },
				{ id: 'bp_branding', label: 'Branding', type: 'multi', options: ['Backdrop', 'Fascia', 'Flooring', 'Graphics', 'Roll-ups'] },
				{ id: 'bp_promoters', label: 'Promoters / hostesses?', type: 'yesno' },
				{ id: 'bp_install', label: 'Install & dismantle?', type: 'yesno' }
			] },
			{ key: 'brand_activation', label: 'Brand Activation', questions: [
				{ id: 'ba_concept', label: 'Activation concept / mechanic', type: 'long' },
				{ id: 'ba_locations', label: 'Locations', type: 'long', hint: 'priority + secondary' },
				{ id: 'ba_count', label: '# locations / cities', type: 'number' },
				{ id: 'ba_footfall', label: 'Footfall / reach target', type: 'text' },
				{ id: 'ba_interactive', label: 'Interactive elements', type: 'multi', options: ['Games', 'AR-VR', 'Photo op', 'Wheel of fortune', 'Digital screen', 'Sampling', 'Demo'] },
				{ id: 'ba_giveaways', label: 'Giveaways?', type: 'yesno' }
			] }
		]
	},
	{
		key: 'VENDORING_PRODUCTION',
		label: 'Vendoring & Production',
		subDomains: [
			{ key: 'branding_production', label: 'Branding / Production', questions: [
				{ id: 'pr_type', label: 'Production type', type: 'select', options: ['Compound / residential decoration', 'FMCG stand', 'Retail display', 'Signage & wayfinding', 'Event production element', 'Other'] },
				{ id: 'pr_items', label: 'Items needed', type: 'multi', options: ['Flags', 'Gates', 'Side ad', 'Stand mockup', 'Backdrop', 'Arch', 'Boxes', 'Roll-up', 'Photo corner', 'Props', 'Photo frame', 'Danglers', 'Direction sign', 'Booth', 'Stickers', 'Vinyl', 'Acrylic', 'Light box', 'Stage'] },
				{ id: 'pr_spec', label: 'Per-item spec', type: 'long', hint: 'quantity, sizes/dimensions, materials, lighting?' },
				{ id: 'pr_design', label: 'Design', type: 'select', options: ['Provided by client', 'We create it'] },
				{ id: 'pr_location', label: 'Delivery location', type: 'text', hint: 'site + access / permissions / working hours' },
				{ id: 'pr_install', label: 'Installation required?', type: 'yesno' },
				{ id: 'pr_deadline', label: 'Delivery deadline', type: 'date' },
				{ id: 'pr_notes', label: 'Notes', type: 'long' }
			] },
			{ key: 'giveaways', label: 'Giveaways', questions: [
				{ id: 'gv_occasion', label: 'Occasion', type: 'select', options: ['General', 'Eco-friendly', 'New year', 'Welcome kit', 'Mother's day', 'Summer', 'Halloween', 'Top performers', 'VIP kit'] },
				{ id: 'gv_type', label: 'Item type', type: 'multi', options: ['Branded merch (t-shirts/caps/bags)', 'Tech gadgets', 'Office supplies', 'Customized (mugs/bottles/keychains)', 'Other'] },
				{ id: 'gv_branding', label: 'Branding elements', type: 'multi', options: ['Colours', 'Logos', 'Personal names', 'Event theme', 'Concept', 'Other'] },
				{ id: 'gv_packaging', label: 'Packaging', type: 'select', options: ['Gift box', 'Bag', 'Branded wrap', 'Plain'] },
				{ id: 'gv_print', label: 'Printing method', type: 'select', options: ['Full print', 'UV', 'Silk screen', 'Laser engrave', 'Sublimation', 'DTF', 'Sticker', 'Stitching'] },
				{ id: 'gv_sides', label: 'Print sides', type: 'select', options: ['1 side', '2 sides', '4 sides'] },
				{ id: 'gv_colours', label: 'Colours', type: 'select', options: ['4 colours', '2 colours', '1 colour'] },
				{ id: 'gv_tier', label: 'Quality tier', type: 'select', options: ['Premium', 'Standard', 'Eco-friendly'] },
				{ id: 'gv_qty', label: 'Quantity', type: 'number' },
				{ id: 'gv_delivery', label: 'Delivery', type: 'select', options: ['One complete batch', 'Multiple batches as completed'] },
				{ id: 'gv_notes', label: 'Notes', type: 'long' }
			] },
			{ key: 'payment_service', label: 'Payment Service', questions: [
				{ id: 'ps_scope', label: 'Service scope', type: 'select', options: ['Vendor sourcing only', 'Pay vendors on client's behalf', 'Procurement & delivery', 'Full vendoring'] },
				{ id: 'ps_what', label: 'What is being procured / paid for', type: 'long' },
				{ id: 'ps_vendors', label: 'Vendor(s)', type: 'long', hint: 'known vendors, or we source them?' },
				{ id: 'ps_amount', label: 'Estimated amount (EGP)', type: 'number', hint: 'value passing through' },
				{ id: 'ps_fee', label: 'Our handling fee / margin', type: 'text', hint: '% or fixed' },
				{ id: 'ps_terms', label: 'Payment terms', type: 'select', options: ['Advance', 'On delivery', 'Milestones', 'Net 30', 'Other'] },
				{ id: 'ps_invoicing', label: 'Invoicing to client', type: 'select', options: ['Single invoice', 'Per vendor', 'By milestone'] },
				{ id: 'ps_deadline', label: 'Timeline / deadline', type: 'date' },
				{ id: 'ps_notes', label: 'Notes', type: 'long' }
			] }
		]
	}
];

function get_saved_answers(frm) {
	try {
		return frm.doc.answers_json ? JSON.parse(frm.doc.answers_json) : {};
	} catch(e) {
		return {};
	}
}

function update_answer(frm, q_id, val) {
	let answers = get_saved_answers(frm);
	answers[q_id] = val;
	frm.doc.answers_json = JSON.stringify(answers, null, 2);
	frm.set_value('answers_json', frm.doc.answers_json);
}

function render_brief_wizard(frm) {
	const field = frm.get_field('brief_interactive_html');
	if (!field || !field.$wrapper) return;

	const verticalKey = frm.doc.vertical || '';
	const subKey = frm.doc.sub_domain || '';
	const currentVertical = VERTICALS.find(v => v.key === verticalKey);
	const currentSub = currentVertical ? currentVertical.subDomains.find(s => s.key === subKey) : null;

	let questions = [];
	if (currentSub) {
		questions = [...GENERAL_QUESTIONS, ...(currentVertical.shared || []), ...currentSub.questions];
	}

	const savedAnswers = get_saved_answers(frm);

	let html = '<div class="trending-wizard-container">';
	
	// Step 1: Company & requester
	html += '<div class="tc-card">';
	html += '<div class="tc-section-header"><span class="tc-step-badge">1</span><div><h3 class="tc-step-title">Company & requester</h3><p class="tc-step-subtitle">Linked Customer & contact details from ERPNext</p></div></div>';
	html += '<div class="tc-grid">';
	html += '<div class="tc-field tc-col-span-2"><label class="tc-label">Company / Client <span class="tc-req">*</span></label>';
	html += '<div class="tc-badge-client"><span>🏢 <b>' + (frm.doc.customer || 'No Customer selected yet') + '</b> ' + (frm.doc.company_name ? '· ' + frm.doc.company_name : '') + '</span></div>';
	html += '</div>';
	html += '<div class="tc-field"><label class="tc-label">Contact Person</label><div class="tc-input" style="background:#f8fafc; color:#475569;">' + (frm.doc.contact_person || '—') + '</div></div>';
	html += '<div class="tc-field"><label class="tc-label">Status</label><div class="tc-input" style="background:#f8fafc; font-weight:600;">' + (frm.doc.status || 'New') + '</div></div>';
	html += '</div></div>';

	// Step 2: Request details
	html += '<div class="tc-card">';
	html += '<div class="tc-section-header"><span class="tc-step-badge">2</span><div><h3 class="tc-step-title">Request details</h3><p class="tc-step-subtitle">Pick the vertical to load the right questions</p></div></div>';
	html += '<div class="tc-grid">';
	html += '<div class="tc-field tc-col-span-2"><label class="tc-label">Request title <span class="tc-req">*</span></label><input type="text" class="tc-input" id="tc_wiz_title" value="' + frappe.utils.escape_html(frm.doc.title || '') + '" placeholder="e.g. Vodafone Family Day" /></div>';
	
	html += '<div class="tc-field"><label class="tc-label">Vertical <span class="tc-req">*</span></label><select class="tc-select" id="tc_wiz_vertical">';
	html += '<option value="">Select vertical…</option>';
	VERTICALS.forEach(v => {
		html += '<option value="' + v.key + '" ' + (v.key === verticalKey ? 'selected' : '') + '>' + v.label + '</option>';
	});
	html += '</select></div>';

	html += '<div class="tc-field"><label class="tc-label">Sub-domain <span class="tc-req">*</span></label><select class="tc-select" id="tc_wiz_subdomain" ' + (!currentVertical ? 'disabled' : '') + '>';
	html += '<option value="">' + (currentVertical ? 'Select sub-domain…' : 'Pick a vertical first') + '</option>';
	if (currentVertical) {
		currentVertical.subDomains.forEach(s => {
			html += '<option value="' + s.key + '" ' + (s.key === subKey ? 'selected' : '') + '>' + s.label + '</option>';
		});
	}
	html += '</select></div>';

	html += '<div class="tc-field"><label class="tc-label">Deal value (EGP)</label><input type="number" class="tc-input" id="tc_wiz_deal_value" value="' + (frm.doc.deal_value || '') + '" placeholder="our expected revenue" /></div>';
	
	html += '<div class="tc-field"><label class="tc-label">Priority</label><select class="tc-select" id="tc_wiz_priority">';
	['Low', 'Medium', 'High', 'Urgent'].forEach(p => {
		html += '<option value="' + p + '" ' + (p === (frm.doc.priority || 'Medium') ? 'selected' : '') + '>' + p + '</option>';
	});
	html += '</select></div>';

	html += '<div class="tc-field tc-col-span-2"><label class="tc-label">Expected delivery date</label><input type="date" class="tc-input" id="tc_wiz_expected_date" value="' + (frm.doc.expected_date || '') + '" /></div>';
	html += '</div></div>';

	// Step 3: Dynamic Brief Questions
	if (currentSub) {
		html += '<div class="tc-card">';
		html += '<div class="tc-section-header"><span class="tc-step-badge">3</span><div><h3 class="tc-step-title">' + currentVertical.label + ' · ' + currentSub.label + ' brief</h3><p class="tc-step-subtitle">Only what this service needs — leave blank what does not apply</p></div></div>';
		html += '<div class="tc-grid">';
		questions.forEach(q => {
			html += render_question_field(q, savedAnswers[q.id]);
		});
		html += '</div></div>';
	} else {
		html += '<div class="tc-empty-state">Pick a vertical and sub-domain above to load the brief questions.</div>';
	}

	html += '</div>';

	field.$wrapper.html(html);
	bind_brief_wizard_events(frm);
}

function render_question_field(q, currentVal) {
	const isWide = q.type === 'long' || q.type === 'multi';
	const colClass = isWide ? 'tc-col-span-2' : '';
	let controlHtml = '';

	if (q.type === 'long') {
		controlHtml = '<textarea class="tc-textarea tc-dyn-input" data-qid="' + q.id + '" placeholder="' + (q.hint || '') + '">' + frappe.utils.escape_html(currentVal || '') + '</textarea>';
	} else if (q.type === 'number') {
		controlHtml = '<input type="number" class="tc-input tc-dyn-input" data-qid="' + q.id + '" value="' + (currentVal || '') + '" placeholder="' + (q.hint || '') + '" />';
	} else if (q.type === 'date') {
		controlHtml = '<input type="date" class="tc-input tc-dyn-input" data-qid="' + q.id + '" value="' + (currentVal || '') + '" />';
	} else if (q.type === 'select') {
		controlHtml = '<select class="tc-select tc-dyn-input" data-qid="' + q.id + '"><option value="">Select…</option>';
		(q.options || []).forEach(opt => {
			controlHtml += '<option value="' + opt + '" ' + (opt === currentVal ? 'selected' : '') + '>' + opt + '</option>';
		});
		controlHtml += '</select>';
	} else if (q.type === 'yesno') {
		controlHtml = '<select class="tc-select tc-dyn-input" data-qid="' + q.id + '"><option value="">—</option><option value="Yes" ' + (currentVal === 'Yes' ? 'selected' : '') + '>Yes</option><option value="No" ' + (currentVal === 'No' ? 'selected' : '') + '>No</option></select>';
	} else if (q.type === 'multi') {
		const selectedArr = Array.isArray(currentVal) ? currentVal : (currentVal ? [currentVal] : []);
		controlHtml = '<div class="tc-pill-group" data-qid="' + q.id + '">';
		(q.options || []).forEach(opt => {
			const checked = selectedArr.includes(opt);
			controlHtml += '<label class="tc-pill-label ' + (checked ? 'active' : '') + '"><input type="checkbox" value="' + frappe.utils.escape_html(opt) + '" ' + (checked ? 'checked' : '') + ' /><span>' + opt + '</span></label>';
		});
		controlHtml += '</div>';
	} else {
		controlHtml = '<input type="text" class="tc-input tc-dyn-input" data-qid="' + q.id + '" value="' + frappe.utils.escape_html(currentVal || '') + '" placeholder="' + (q.hint || '') + '" />';
	}

	return '<div class="tc-field ' + colClass + '"><label class="tc-label">' + q.label + '</label>' + controlHtml + (q.hint && q.type !== 'long' && q.type !== 'number' && q.type !== 'text' ? '<span class="tc-hint">' + q.hint + '</span>' : '') + '</div>';
}

function bind_brief_wizard_events(frm) {
	const $w = frm.get_field('brief_interactive_html').$wrapper;

	$w.find('#tc_wiz_title').on('input', function() {
		frm.set_value('title', $(this).val());
	});

	$w.find('#tc_wiz_vertical').on('change', function() {
		const v = $(this).val();
		frm.set_value('vertical', v);
		const vertObj = VERTICALS.find(item => item.key === v);
		if (vertObj && vertObj.subDomains.length > 0) {
			frm.set_value('sub_domain', vertObj.subDomains[0].key);
		} else {
			frm.set_value('sub_domain', '');
		}
		render_brief_wizard(frm);
	});

	$w.find('#tc_wiz_subdomain').on('change', function() {
		const s = $(this).val();
		frm.set_value('sub_domain', s);
		render_brief_wizard(frm);
	});

	$w.find('#tc_wiz_deal_value').on('input', function() {
		frm.set_value('deal_value', $(this).val());
	});

	$w.find('#tc_wiz_priority').on('change', function() {
		frm.set_value('priority', $(this).val());
	});

	$w.find('#tc_wiz_expected_date').on('change', function() {
		frm.set_value('expected_date', $(this).val());
	});

	$w.find('.tc-dyn-input').on('change input', function() {
		const qid = $(this).data('qid');
		const val = $(this).val();
		update_answer(frm, qid, val);
	});

	$w.find('.tc-pill-group').each(function() {
		const $group = $(this);
		const qid = $group.data('qid');
		$group.find('input[type="checkbox"]').on('change', function() {
			$(this).closest('.tc-pill-label').toggleClass('active', this.checked);
			const selected = [];
			$group.find('input[type="checkbox"]:checked').each(function() {
				selected.push($(this).val());
			});
			update_answer(frm, qid, selected);
		});
	});
}
