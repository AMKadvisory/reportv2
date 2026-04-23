// ═══════════════════════════════════════════════════════════
//  forms/ebl-sme-land/pdf-template.js
//  ► Edit THIS file to change the EBL SME Land PDF.
//  ► SELF-CONTAINED — no dependency on pdf-engine.js
//
//  Page map (mirrors EBL HTML sheet by sheet):
//    Page 1  → Sheet 1  Cover (Ref A/C, Ref No, Submitted by/to)
//    Page 2  → Sheet 2  Cover Letter + Valuation table + Signatures
//    Page 3  → Sheet 3  A. Account  +  B. Owner + C. Schedule
//    Page 4  → Sheet 4  D. Identification + E. Other Features + F. Civil Construction
//    Page 5  → Sheet 5  G. Overall Valuation +  H. decleration 
//    Page 6 +→ Sheet 6  photo sheets (annexures) 
// ═══════════════════════════════════════════════════════════
const EBLSmeLandPDF = {

    async render(formData, _E, mode) {
        const fd = formData || {};

        // ── Value helpers (were E.v / E.dt) ─────────────────
        const v  = (k, fb = '') => { const val = fd[k]; return (val === undefined || val === null || val === '') ? fb : String(val); };
        const dt = (k) => {
            const s = fd[k];
            if (!s) return '—';
            try { return new Date(s).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }); }
            catch(e) { return s; }
        };

        // Number helpers
        const raw = (k) => parseFloat((fd[k] || '0').toString().replace(/,/g, '')) || 0;
        const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        // ── Page constants (were E.PW / E.ML etc.) ───────────
        const PW = 210, PH = 297;
        const MT = 25, MB = 20;
        const ML = 24, MR = 18;
        const CW = PW - ML - MR;
        const HEADER_W = 127, HEADER_H = 12.7;
        const FOOTER_H = 10.9;
        const CONTENT_BOTTOM = PH - FOOTER_H - 2;

        // ── jsPDF init (was E.init()) ────────────────────────
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        // ── Image loader (was E._loadImg) ────────────────────
        const loadImg = (src) => new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width  = img.naturalWidth  || img.width;
                canvas.height = img.naturalHeight || img.height;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = src;
        });

        const headerImg = await loadImg(null);
        const footerImg = await loadImg(null);

        // ── Typography helpers (were E.bold / E.normal / E.italic) ──
        const bold   = (sz = 10) => { doc.setFont('times', 'bold');   doc.setFontSize(sz); doc.setTextColor(0,0,0); };
        const normal = (sz = 10) => { doc.setFont('times', 'normal'); doc.setFontSize(sz); doc.setTextColor(0,0,0); };
        const italic = (sz = 10) => { doc.setFont('times', 'italic'); doc.setFontSize(sz); doc.setTextColor(0,0,0); };

        // ── Header & footer (was E.drawHeaderFooter) ─────────
        const drawHeaderFooter = () => {
            if (headerImg) {
                try { doc.addImage(headerImg, 'PNG', (PW - HEADER_W) / 2, 5, HEADER_W, HEADER_H); } catch(e) {}
            }
            if (footerImg) {
                try { doc.addImage(footerImg, 'PNG', 0, PH - FOOTER_H, PW, FOOTER_H); } catch(e) {}
            }
        };

        // ── New page (was E.newPage()) ────────────────────────
        const newPage = () => {
            doc.addPage();
            drawHeaderFooter();
            return MT;
        };

        // Draw header/footer on page 1 and set starting y (was E.init() return value)
        drawHeaderFooter();
        let y = MT;

        // ── Local drawing helpers ──────────────────────────

        // Grey-label : white-value key-value row
        const kvRow = (y, label, val, lw = 60) => {
            const vw    = CW - lw - 4;
            const lines = doc.splitTextToSize(String(val || ''), vw - 2);
            const rh    = Math.max(5, lines.length * 4.5 + 0.5);
            if (y + rh > CONTENT_BOTTOM) y = newPage();
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
            doc.setFillColor(255,255,255); doc.rect(ML,      y, lw,  rh, 'FD');
            doc.setFillColor(255,255,255); doc.rect(ML+lw,   y, 4,   rh, 'FD');
            doc.rect(ML+lw+4, y, vw, rh, 'FD');
            bold(10);   doc.text(String(label), ML+1.5, y+4);
            normal(10); doc.text(':', ML+lw+1.2, y+4);
            doc.text(lines[0], ML+lw+5.5, y+4);
            for (let i = 1; i < lines.length; i++) doc.text(lines[i], ML+lw+5.5, y+4+i*4.5);
            return y + rh;
        };

        const heading = (y, text) => {
            if (y + 8 > CONTENT_BOTTOM) y = newPage();
            bold(12); doc.text(text, ML, y+5);
            const textWidth = doc.getTextWidth(text);
            doc.setLineWidth(0.3); doc.line(ML, y+6.5, ML+textWidth, y+6.5);
            normal(10); return y + 9;
        };

        // Table header row — FIX: measure actual multi-line height before drawing
        const tblHeader = (y, cols, cws) => {
            // Calculate the required header height based on wrapped text in each cell
            let hdrH = 5;
            bold(9);
            cols.forEach((c, i) => {
                const ls = doc.splitTextToSize(c, cws[i] - 2);
                hdrH = Math.max(hdrH, ls.length * 4.5 + 0.5);
            });
            if (y + hdrH > CONTENT_BOTTOM) y = newPage();
            let x = ML;
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
            cols.forEach((c, i) => {
                doc.rect(x, y, cws[i], hdrH);
                const ls = doc.splitTextToSize(c, cws[i] - 2);
                // Vertically center multi-line text within the header cell
                const totalTextH = (ls.length - 1) * 4.5;
                const textStartY = y + (hdrH - totalTextH) / 2 + 1;
                doc.text(ls, x + cws[i] / 2, textStartY, { align: 'center' });
                x += cws[i];
            });
            return y + hdrH;
        };

        // Table data row
        const tblRow = (y, cells, cws, firstBold = true) => {
            let rh = 5;
            cells.forEach((c, i) => {
                const ls = doc.splitTextToSize(String(c||''), cws[i]-1);
                rh = Math.max(rh, ls.length * 4.5 + 0.5);
            });
            if (y + rh > CONTENT_BOTTOM) y = newPage();
            let x = ML;
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
            cells.forEach((c, i) => {
                doc.rect(x, y, cws[i], rh);
                const ls   = doc.splitTextToSize(String(c||''), cws[i]-1);
                const align = i === 0 ? 'left' : 'center';
                const tx    = i === 0 ? x+1.5 : x+cws[i]/2;
                if (i === 0 && firstBold) bold(9); else normal(9);
                doc.text(ls, tx, y+4, { align });
                x += cws[i];
            });
            return y + rh;
        };

        // Formula italic sub-row
        const formulaRow = (y, cells, cws) => {
            if (y + 5 > CONTENT_BOTTOM) y = newPage();
            let x = ML;
            italic(8); doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
            cells.forEach((c, i) => {
                doc.rect(x, y, cws[i], 5);
                doc.text(String(c), x+cws[i]/2, y+3.5, { align: 'center' });
                x += cws[i];
            });
            normal(10); return y + 5;
        };

        // Numbered list with overflow check
        const numberedList = (y, items) => {
            items.forEach((txt, i) => {
                const prefix = `${i+1}. `;
                const prefixW = doc.getTextWidth(prefix);
                const ls = doc.splitTextToSize(txt, CW - 4 - prefixW);
                if (y + ls.length*4.5 > CONTENT_BOTTOM) y = newPage();
                normal(10);
                doc.text(prefix, ML+2, y);
                doc.text(ls, ML+2+prefixW, y, { align: 'justify', maxWidth: CW - 4 - prefixW });
                y += ls.length*4 + 0.5;
            });
            return y;
        };

        // Pre-compute valuation values
        const mArea = raw('market_land_area');
        const mRate = raw('market_rate');
        const mLand = mArea * mRate;
        const zArea = raw('mouza_land_area');
        const zRate = raw('mouza_rate');
        const zLand = zArea * zRate;

        

        // ════════════════════════════════════════════════════
        //  PAGE 1 — COVER  (Sheet 1)
        // ════════════════════════════════════════════════════

        // Title
        const titleY = 80;
        bold(18);
        doc.text('INSPECTION SURVEY & VALUATION REPORT', PW/2, titleY, { align:'center' });

        // Reference fields — centered block
        let ry = titleY + 50;
        const refLabelW = 52, refColonW = 4;
        const refStartX = (PW - refLabelW - refColonW - 60) / 2;
        [
            ['Reference Account Name', v('reference_account_name')],
            ['Reference No.',          v('reference_no')],
            ['W/O Received Date',      dt('wo_received_date')],
            ['Date of Inspection',     dt('date_of_inspection')],
        ].forEach(([lbl, val]) => {
            bold(10);
            doc.text(lbl, refStartX, ry);
            doc.text(':', refStartX + refLabelW, ry);
            doc.text(String(val), refStartX + refLabelW + refColonW + 1, ry);
            ry += 6;
        });

        ry += 10; // ← gap between reference and surveyor blocks

        // Surveyor table
        [
            ['Surveyor Name',   v('surveyor_name')],
            ['Designation',     v('surveyor_designation')],
            ['NID Number',      v('surveyor_nid')],
            ['Contact Number',  v('surveyor_contact')],
        ].forEach(([lbl, val]) => {
            bold(10);
            doc.text(lbl, refStartX, ry);
            doc.text(':', refStartX + refLabelW, ry);
            doc.text(String(val), refStartX + refLabelW + refColonW + 1, ry);
            ry += 6;
        });


        // Submitted boxes
        const boxTop = 220;
        const rNameLines = doc.splitTextToSize(v('recipient_name'), CW/2-14);
        const addrL      = doc.splitTextToSize(v('recipient_address'), CW/2-14);
        const boxH = Math.max(40, 14 + Math.max(6, rNameLines.length + addrL.length) * 5.5);

        doc.setDrawColor(0,0,0); doc.setFillColor(255,255,255);

        // Draw outer rectangle spanning both boxes (single shared border)
        doc.rect(ML, boxTop, CW, boxH, 'FD');

        // Draw only the vertical divider line in the middle
        const midX = ML + CW/2;
        doc.line(midX, boxTop, midX, boxTop + boxH);

        let by = boxTop + 6;
        bold(10);  doc.text('Submitted by:', ML+3, by); by += 6;
        bold(10);  doc.text('AMK Associates Limited', ML+3, by); by += 5.5;
        normal(10);
        doc.text('68, Khilgaon Chowdhury Para (4th floor)', ML+3, by); by += 5;
        doc.text('DIT Road Rampura, Dhaka-1219', ML+3, by); by += 5;
        doc.text('E-mail: www.amkassociatesbd@gmail.com', ML+3, by); by += 5;
        doc.text('Web: www.amkassociatesbd.com', ML+3, by); by += 5;
        doc.text('Contact: 01841132714', ML+3, by);

        const rx = midX + 3;
        let ty = boxTop + 6;
        bold(10); doc.text('Submitted to:', rx, ty); ty += 6;
        rNameLines.forEach(l => { bold(10); doc.text(l, rx, ty); ty += 5.5; });
        normal(10); addrL.forEach(l => { doc.text(l, rx, ty); ty += 5; });

        
        // ══════════════════════════════════════════════════
        //  PAGE 2 – COVER LETTER  (Sheet 2)
        // ══════════════════════════════════════════════════
        y = newPage();
        normal(10);
        doc.text('Ref.: ' + v('letter_ref'),  ML, y); y += 6;
        doc.text('Date: ' + dt('letter_date'), ML, y); y += 9;
        bold(10); doc.text(v('recipient_name'), ML, y); y += 5;
        normal(10);
        const addrL2 = doc.splitTextToSize(v('recipient_address'), CW);
        doc.text(addrL2, ML, y); y += addrL2.length*4.5 + 5;

        bold(10);
        doc.text('Subject: Inspection, Survey & Valuation Report', ML, y, { maxWidth: CW }); y += 6;
        doc.text('Ref. A/C Name: ' + v('reference_account_name'), ML, y); y += 8;

        normal(10);
        doc.text('Dear Sir,', ML, y); y += 5;
        doc.text('Greetings from AMK Associates Limited and Thank You very much for referring us!', ML, y, { maxWidth: CW }); y += 8;
        const bodyStr = 'Pursuant to your communication through ' + v('comm_medium') +
            ', dated: ' + dt('comm_date') + ' by ' + v('comm_person') +
            ', we, AMK Associates Limited ("AMK") has conducted the inspection, survey and valuation.' +
            ' Summary of the valuation is as below:';
        const bodyLines = doc.splitTextToSize(bodyStr, CW);
        doc.text(bodyLines, ML, y); y += bodyLines.length*4.5 + 5;


        // ── Valuation table ───────────────────────────────────────────────────
        // Columns: Description | Land Area (Decimal) | Rate/Decimal (BDT) | Total Land Value (BDT)
        const vCws = [52, 30, 36, 48]; // must sum to page content width (166)

        italic(9); doc.text('Amount in BDT', ML + vCws.reduce((a,b)=>a+b,0), y, { align: 'right' }); y += 4;

        // ── Header block (two-row: labels + formula) ──────────────────────────
        const hdrH1 = 11, hdrH2 = 5;
        const totalHdrH = hdrH1 + hdrH2;
        doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);
        bold(9);

        // Outer border for entire header block
        doc.rect(ML, y, vCws.reduce((a,b)=>a+b,0), totalHdrH);

        // Vertical dividers across full header height
        let hx = ML;
        for (let i = 0; i < vCws.length - 1; i++) {
            hx += vCws[i];
            doc.line(hx, y, hx, y + totalHdrH);
        }

        // Horizontal divider between label row and formula row (skip Description col)
        doc.line(ML + vCws[0], y + hdrH1, ML + vCws.reduce((a,b)=>a+b,0), y + hdrH1);

        // Description — vertically centered across full header height
        doc.text('Description', ML + vCws[0]/2, y + totalHdrH/2 + 1.5, { align: 'center' });

        // Other column labels (top row)
        hx = ML + vCws[0];
        const hdrLabels = [
            'Total Land Area\n(Decimal)',
            'Present Rate per\nDecimal (BDT)',
            'Total Land Value\n(BDT)',
        ];
        for (let i = 0; i < hdrLabels.length; i++) {
            const ls = doc.splitTextToSize(hdrLabels[i], vCws[i+1] - 1);
            doc.text(ls, hx + vCws[i+1]/2, y + 3.5, { align: 'center' });
            hx += vCws[i+1];
        }

        // Formula row (bottom row)
        italic(8);
        hx = ML + vCws[0];
        const formulas = ['a', 'b', 'c = a × b'];
        for (let i = 0; i < formulas.length; i++) {
            doc.text(formulas[i], hx + vCws[i+1]/2, y + hdrH1 + 3.5, { align: 'center' });
            hx += vCws[i+1];
        }
        y += totalHdrH;

        // ── Data rows ─────────────────────────────────────────────────────────

        // Pull values from form data; strip commas for numeric use, keep formatted for display
        // ── Data rows ─────────────────────────────────────────────────────────
        // Read display-ready formatted strings directly from saved form data
        const dataRows = [
            ['Present Market Value',         fd.market_land_area || '', fd.market_rate    || '', fd.market_land_val  || ''],
            ['Forced Sale Value (20% less)', fd.forced_land_area || '', fd.forced_rate    || '', fd.forced_land_val  || ''],
            ['Mouza Value',                  fd.mouza_land_area  || '', fd.mouza_rate     || '', fd.mouza_land_val   || ''],
        ];

        dataRows.forEach(cells => {
            // Calculate row height from the tallest wrapped cell
            let rh = 7;
            cells.forEach((c, i) => {
                const ls = doc.splitTextToSize(String(c || ''), vCws[i] - 2);
                rh = Math.max(rh, ls.length * 4.5 + 3);
            });

            if (y + rh > CONTENT_BOTTOM) y = newPage();
            doc.setDrawColor(0,0,0); doc.setLineWidth(0.2);

            let dx = ML;
            cells.forEach((c, i) => {
                doc.rect(dx, y, vCws[i], rh);
                const ls    = doc.splitTextToSize(String(c || ''), vCws[i] - 2);
                const align = i === 0 ? 'left' : 'center';
                const tx    = i === 0 ? dx + 2 : dx + vCws[i]/2;
                if (i === 0) bold(9); else normal(9);
                const textY = y + (rh - (ls.length - 1) * 4.5) / 2 + 1;
                doc.text(ls, tx, textY, { align });
                dx += vCws[i];
            });
            y += rh;
        });
        y += 5;

        normal(10);
        const p1L = doc.splitTextToSize('The report has been prepared based on our physical inspection, verification, necessary documents as provided by concern office/individual, local market analysis and assessment to the best of our knowledge.', CW);
        doc.text(p1L, ML, y); y += p1L.length*4.5 + 4;
        doc.text('Detail Report and necessary attachments are enclosed herewith for your record and perusal.', ML, y, { maxWidth: CW }); y += 6;
        doc.text('For any query, please feel free to contact us.', ML, y); y += 6;
        doc.text('With best regards,', ML, y); y += 18;

        // Signatures
        doc.setDrawColor(0,0,0);
        doc.line(ML, y, ML+50, y);
        doc.line(ML+100, y, ML+150, y); 
        y += 5;
        bold(10);
        doc.text(v('valuer_1_name'), ML,      y);
        doc.text(v('valuer_2_name'), ML+100,  y); y += 5;
        normal(10);
        doc.text(v('valuer_1_designation'), ML,     y);
        doc.text(v('valuer_2_designation'), ML+100, y); y += 15;

        // Enclosures
        const encl = [
            ['1. Annexure-I: Photograph of Property',   '5. Annexure-V: QR Code for video'],
            ['2. Annexure-II: Hand Sketch Map',          '6. Annexure-VI: QR Code for Map'],
            ['3. Annexure-III: Mouza Map',               '7. Annexure-VII: SRO Mouza Value'],
            ['4. Annexure-IV: Location on Google Map',   '8. Annexure-VIII: Status In Area Master Plan'],
        ];
        italic(10); doc.text('Encl:', ML, y);
        italic(9);
        const enclIndent = ML + 16; // indent after 'Encl:'
        const enclColW   = CW / 2;
        encl.forEach(([left, right]) => {
            doc.text(left,  enclIndent,           y);
            doc.text(right, enclIndent + enclColW, y);
            y += 4.5;
        });
        
        // ══════════════════════════════════════════════════
        //  PAGE 3 – A , B & C (Sheet 3)
        // ══════════════════════════════════════════════════

        // SECTION A: Account 
        y = newPage();
        y = heading(y, 'A. Particulars of Account:');
        [ 
            ['A/C Name',                                v('ac_name')],
            ['Office/Business Address',                 v('office_address')],
            ['Factory Address',                         v('factory_address')],
            ['Nature of Business',                      v('nature_of_business')],
            ['Age of Business',                         v('age_of_business')],
            ['Organization Type',                       v('organization_type')],
            ['Contact Person Name',                     v('contact_person_name')],
            ['Mobile Number of Contact Person',         v('mobile_number')],
        ].forEach(([l, val]) => { y = kvRow(y, l, val,68); });
        y += 4;

        // SECTION B: Owner details
        y = heading(y, 'B. Particulars of Property Owner:');
        [
            ["Property Owner(s) Name",   v('owner_name')],
            ["Father's Name",             v('owner_father')],
            ["Mother's Name",             v('owner_mother')],
            ['Present Address',           v('owner_present_address')],
            ['Permanent Address',         v('owner_perm_address')],
            ['Contact Number',            v('owner_contact')],
            ['NID Number',                v('owner_nid')],
            ['Relationship with Borrower',v('owner_relationship')],
        ].forEach(([l, val]) => { y = kvRow(y, l, val,68); });
        y += 4;

        // SECTION C: Schedule of Property
        y = heading(y, 'C. Schedule of Property:');
        [
            ['District',                            v('district')],
            ['Thana / Upazila',                     v('thana_upazila')],
            ['Mouza',                               v('mouza')],
            ['JL No.',                              v('jl_no')],
            ['Local Authority',                     v('local_authority')],
            ['Land Office',                         v('land_office')],
            ['Sub-Register Office',                 v('sub_register_office')],
            ['Khatian No.',                         v('khatian_no')],
            ['Corresponding Dag No.',               v('dag_no')],
            ['Deed Number & Registration Date',     v('deed_number_date')],
            ['Mutation Khatian No.',                v('mutation_khatian_no')],
            ['Jote No.',                            v('jote_no')],
            ['DCR No.',                             v('dcr_no')],
            ['GRR No.',                             v('grr_no')],
            ['Land Type (LDTR)',                    v('land_type_ldtr')],
            ['Property Address',                    v('property_address')],
            ['Last Ownership Transfer',             v('last_ownership_transfer')],
            ['Total Area of Land as per Deed',      v('total_area_deed')],
            ['Total Area of Land Physically found', v('total_area_physical')],
            ['Way to Visit Property',               v('way_to_visit')],
        ].forEach(([l, val]) => { y = kvRow(y, l, val, 68); });

        // ══════════════════════════════════════════════════
        //  PAGE 4 – D & E  (Sheet 4)
        // ══════════════════════════════════════════════════
        // SECTION D: Property Identification
        y = newPage();
        y = heading(y, 'D. Property Identification:');
        const dCws = [20, 37, 37, 37, 37];
        y = tblHeader(y, ['Direction','Chowhoddi as Per Deed','Present Chowhoddi','Demarcation','Access Road'], dCws);
        ['north','south','east','west'].forEach(dir => {
            y = tblRow(y, [
                dir.charAt(0).toUpperCase()+dir.slice(1),
                v(dir+'_deed'), v(dir+'_present'), v(dir+'_demar'), v(dir+'_road')
            ], dCws);
        });
        y += 4;

        // SECTION E: Other Features of Property
        y = heading(y, 'E. Other Features of Property:');
         [
            ['Electricity',                                  v('electricity')],
            ['GAS',                                          v('gas')],
            ['Water Supply',                                 v('water_supply')],
            ['Sewerage System',                              v('sewerage')],
            ['Internet',                                     v('internet')],
            ['Satellite / Google Location',                  v('satellite_location')],
            ['Status of access Road for Transports',         v('access_road_status')],
            ['Nature of Land',                               v('nature_of_land')],
            ['Type of Land',                                 v('type_of_land')],
            ['Plot Location',                                v('plot_location')],
            ['Description of the Property',                  v('description_of_property')],
            ['Usage Restriction',                            v('usage_restriction')],
            ['Possibility of Frequent Flood',                v('flood_possibility')],
            ['Classification of Land',                       v('land_classification')],
            ['Status in Area Master Plan',                   v('status_master_plan')],
            ['Current Possession',                           v('current_possession')],
            ['Public Establishments nearby the Property',    v('public_establishments')],
            ['Distance from nearby Prominent location',      v('dist_prominent')],
            ['Distance from nearby Main Road',               v('dist_main_road')],
            ['Distance from nearby Branch / Office',         v('dist_branch_office')],
            ['Annual Income from the Property',              v('annual_income')],
            ['Present Use of the Property',                  v('present_use')],
            ['Future Prospect',                              v('future_prospect')],
        ].forEach(([l, val]) => { y = kvRow(y, l, val, 68); });

        // F. Price Reference – structured table
        y = heading(y, 'F. Price Reference:');
        [['Maximum Price',                      v('max_price')],
         ['Minimum Price',                      v('min_price')],
         ['Last Buy-Sell Record',               v('last_buy_sell')],
         ['Recent Valuation in that area',      v('recent_valuation')],
         ['Price Justification',                v('price_justification')],
        ].forEach(([l, val]) => { y = kvRow(y, l, val,68); });
        y += 6;


        // ══════════════════════════════════════════════════
        //  PAGE 5 – G, H  (Sheet 5)
        // ══════════════════════════════════════════════════
        y = newPage();
        // K. About our overall Valuation – 9 static points
        y = heading(y, 'K. About our overall Valuation:');
        y+=2;
        y = numberedList(y, [
            'Physical inspection and measure, as necessary.',
            'Interview with local people.',
            'Interview with owner.',
            'Market price of recent transfer of property in nearby locality.',
            'Access road and transport facility.',
            'Current economic activity and development features in the locality.',
            'Future prospect of the locality.',
            'Present Market Value has been considered based on various parameters including but not limited to the above. Mentionable here that the said value may vary time to time on different aspects or situations which may not match with the basis of present valuation.',
            "In case of Forced Sale Value, the rate is assumed based on the property's demand, price, marketability and other factors, which may have relation to unforeseen or uncontrollable event that drives to sell the property within a short duration.",
        ]);
        y += 5;

        // L. Declaration – 9 static points
        if (y + 20 > CONTENT_BOTTOM) y = newPage();
        y = heading(y, 'L. Declaration:');
        y+=2;
        y = numberedList(y, [
            'The valuation has been performed based on our physical inspection, verification, local market analysis and assessment to the best of our knowledge and all the information provided in this report is based on the property/ land related documents, other necessary documents and information as provided by the concerned Bank/ NBFI/ Officials/ Property Owner/ Borrower/ Individual (the client). No responsibility is accepted for any errors resulting from incorrect information provided by the client.',
            'The inspection was limited to a visual examination only. So, AMK shall not be held responsible, for any latent defects not apparent during inspection.',
            "AMK's responsibility is limited to the valuation of the said property only without considering any legal matter related to the property and documents as well.",
            'This report is not a certificate of title or ownership. Legal verification should be undertaken independently.',
            'The valuation reflects the market value on the date of inspection only. No responsibility is accepted for any changes in market conditions thereafter.',
            'Except inspection, survey and valuation of the said property, AMK or any of its Officials has no interest directly or indirectly, at present or in near future in any manner whatsoever in the subject matter of this report.',
            'This report is not intended to absolve the concerned parties from their contractual obligations.',
            'This report is confidential and intended only for the named client. AMK accepts no liability to any third party for any loss or damage suffered as a result of reliance on this report.',
            'The report is duly signed by the authorized signatories of AMK and it contains 15 (Fifteen) pages.',
        ]);

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-I – PHOTOS (2 per page, 158×102mm each)
        // ══════════════════════════════════════════════════════════
        const ann1 = Array.isArray(fd._ann1_photos) ? fd._ann1_photos : [];
        if (ann1.length) {
            const imgW = 158, imgH = 102, capH = 7, perPage = 2;
            const totalSlotH = imgH + capH;
            const gapBetween = 8;

            for (let i = 0; i < ann1.length; i++) {
                if (i % perPage === 0) {
                    y = newPage();
                    // Annexure heading
                    bold(11);
                    const ann1Title = 'Annexure-I: Photograph of Property';
                    doc.text(ann1Title, ML, y + 5);
                    const ann1TitleW = doc.getTextWidth(ann1Title);
                    doc.setLineWidth(0.3);
                    doc.line(ML, y + 6.5, ML + ann1TitleW, y + 6.5);
                    y += 14;
                }

                const slot = i % perPage;
                const iy = y + slot * (totalSlotH + gapBetween);
                const imgX = ML + (CW - imgW) / 2;

                // Draw image
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = ann1[i].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(ann1[i].dataUrl, fmt2, imgX, iy, imgW, imgH);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX, iy, imgW, imgH, 'FD');
                }
                doc.rect(imgX, iy, imgW, imgH);

                // Caption
                const cap1 = ann1[i].caption || ann1[i].name.replace(/\.[^/.]+$/, '');
                const cap1Lines = doc.splitTextToSize(cap1, imgW);
                italic(9);
                doc.text(cap1Lines, ML + CW / 2, iy + imgH + 4.5, { align: 'center' });
            }
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-II – HAND SKETCH MAP (description + 158×178mm)
        // ══════════════════════════════════════════════════════════
        const ann2 = Array.isArray(fd._ann2_photos) ? fd._ann2_photos : [];
        {
            y = newPage();
            // Heading
            bold(11);
            const ann2Title = 'Annexure-II: Hand Sketch Map';
            doc.text(ann2Title, ML, y + 5);
            const ann2TitleW = doc.getTextWidth(ann2Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann2TitleW, y + 6.5);
            y += 14;

            // Description
            const ann2Desc = fd.annexure2_desc || '';
            if (ann2Desc) {
                normal(10);
                const descLines = doc.splitTextToSize(ann2Desc, CW);
                doc.text(descLines, ML, y);
                y += descLines.length * 4.5 + 6;
            }

            // Image
            if (ann2.length) {
                const imgW = 158, imgH = 178;
                const imgX = ML + (CW - imgW) / 2;
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = ann2[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(ann2[0].dataUrl, fmt2, imgX, y, imgW, imgH);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX, y, imgW, imgH, 'FD');
                }
                doc.rect(imgX, y, imgW, imgH);

                // Caption
                const cap2 = ann2[0].caption || ann2[0].name.replace(/\.[^/.]+$/, '');
                const cap2Lines = doc.splitTextToSize(cap2, imgW);
                italic(9);
                doc.text(cap2Lines, ML + CW / 2, y + imgH + 4.5, { align: 'center' });
                y += imgH + 10;
            }
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-III – MOUZA MAP (description + 158×178mm)
        // ══════════════════════════════════════════════════════════
        const ann3 = Array.isArray(fd._ann3_photos) ? fd._ann3_photos : [];
        {
            y = newPage();
            // Heading
            bold(11);
            const ann3Title = 'Annexure-III: Mouza Map';
            doc.text(ann3Title, ML, y + 5);
            const ann3TitleW = doc.getTextWidth(ann3Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann3TitleW, y + 6.5);
            y += 14;

            // Description
            const ann3Desc = fd.annexure3_desc || '';
            if (ann3Desc) {
                normal(10);
                const descLines = doc.splitTextToSize(ann3Desc, CW);
                doc.text(descLines, ML, y);
                y += descLines.length * 4.5 + 6;
            }

            // Image
            if (ann3.length) {
                const imgW = 158, imgH = 178;
                const imgX = ML + (CW - imgW) / 2;
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = ann3[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(ann3[0].dataUrl, fmt2, imgX, y, imgW, imgH);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX, y, imgW, imgH, 'FD');
                }
                doc.rect(imgX, y, imgW, imgH);

                // Caption
                const cap3 = ann3[0].caption || ann3[0].name.replace(/\.[^/.]+$/, '');
                const cap3Lines = doc.splitTextToSize(cap3, imgW);
                italic(9);
                doc.text(cap3Lines, ML + CW / 2, y + imgH + 4.5, { align: 'center' });
                y += imgH + 10;
            }
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-IV – GOOGLE MAP (1 line desc + 2 images 158×102mm)
        // ══════════════════════════════════════════════════════════
        const ann4 = Array.isArray(fd._ann4_photos) ? fd._ann4_photos : [];
        {
            y = newPage();
            // Heading
            bold(11);
            const ann4Title = 'Annexure-IV: Location on Google Map';
            doc.text(ann4Title, ML, y + 5);
            const ann4TitleW = doc.getTextWidth(ann4Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann4TitleW, y + 6.5);
            y += 14;

            // One line description
            const ann4Desc = fd.annexure4_desc || '';
            if (ann4Desc) {
                normal(10);
                doc.text(ann4Desc, ML, y);
                y += 7;
            }

            // Two images stacked
            const imgW4 = 158, imgH4 = 102, capH4 = 7, gap4 = 8;
            ann4.slice(0, 2).forEach((photo, i) => {
                const imgX = ML + (CW - imgW4) / 2;
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = photo.dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(photo.dataUrl, fmt2, imgX, y, imgW4, imgH4);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(imgX, y, imgW4, imgH4, 'FD');
                }
                doc.rect(imgX, y, imgW4, imgH4);

                // Caption
                const cap4 = photo.caption || photo.name.replace(/\.[^/.]+$/, '');
                const cap4Lines = doc.splitTextToSize(cap4, imgW4);
                italic(9);
                doc.text(cap4Lines, ML + CW / 2, y + imgH4 + 4.5, { align: 'center' });
                y += imgH4 + capH4 + gap4;
            });
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-V & VI – QR CODES (same page, 51×51mm each, centered)
        // ══════════════════════════════════════════════════════════
        const ann5 = Array.isArray(fd._ann5_photos) ? fd._ann5_photos : [];
        const ann6 = Array.isArray(fd._ann6_photos) ? fd._ann6_photos : [];
        {
            y = newPage();
            const qrW = 51, qrH = 51;
            const qrX = ML + (CW - qrW) / 2;

            // Annexure V heading
            bold(11);
            const ann5Title = 'Annexure-V: QR Code for video of the Property';
            doc.text(ann5Title, ML, y + 5);
            const ann5TitleW = doc.getTextWidth(ann5Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann5TitleW, y + 6.5);
            y += 14;

            // QR V image
            if (ann5.length) {
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = ann5[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(ann5[0].dataUrl, fmt2, qrX, y, qrW, qrH);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(qrX, y, qrW, qrH, 'FD');
                }
                doc.rect(qrX, y, qrW, qrH);
            } else {
                // Placeholder box if no image
                doc.setFillColor(240, 240, 240);
                doc.rect(qrX, y, qrW, qrH, 'FD');
            }
            y += qrH + 14;

            // Annexure VI heading
            bold(11);
            const ann6Title = 'Annexure-VI: QR Code for Map of the Property';
            doc.text(ann6Title, ML, y + 5);
            const ann6TitleW = doc.getTextWidth(ann6Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann6TitleW, y + 6.5);
            y += 14;

            // QR VI image
            if (ann6.length) {
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                try {
                    const fmt2 = ann6[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    doc.addImage(ann6[0].dataUrl, fmt2, qrX, y, qrW, qrH);
                } catch(e) {
                    doc.setFillColor(230, 230, 230);
                    doc.rect(qrX, y, qrW, qrH, 'FD');
                }
                doc.rect(qrX, y, qrW, qrH);
            } else {
                doc.setFillColor(240, 240, 240);
                doc.rect(qrX, y, qrW, qrH, 'FD');
            }
            y += qrH + 14;

            // Instructions
            bold(10);
            doc.text('Instructions for use:', ML + 20, y); y += 6;
            italic(9);
            ['Download & install any QR Code scanner/reader.',
            'Scan the attached QR Code.',
            'Open the link using Google Chrome/any browser.',
            ].forEach(inst => {
                doc.circle(ML + 23, y - 1, 0.8, 'F');
                doc.text(inst, ML + 26, y);
                y += 5.5;
            });
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-VII – SRO MOUZA VALUE (full page, 158×178mm)
        // ══════════════════════════════════════════════════════════
        const ann7 = Array.isArray(fd._ann7_photos) ? fd._ann7_photos : [];
        if (ann7.length) {
            y = newPage();
            // Heading
            bold(11);
            const ann7Title = 'Annexure-VII: SRO Mouza Value';
            doc.text(ann7Title, ML, y + 5);
            const ann7TitleW = doc.getTextWidth(ann7Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann7TitleW, y + 6.5);
            y += 14;

            const imgW = 158, imgH = 178;
            const imgX = ML + (CW - imgW) / 2;
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
            try {
                const fmt2 = ann7[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(ann7[0].dataUrl, fmt2, imgX, y, imgW, imgH);
            } catch(e) {
                doc.setFillColor(230, 230, 230);
                doc.rect(imgX, y, imgW, imgH, 'FD');
            }
            doc.rect(imgX, y, imgW, imgH);
        }

        // ══════════════════════════════════════════════════════════
        //  ANNEXURE-VIII – AREA MASTER PLAN (full page, 158×178mm)
        // ══════════════════════════════════════════════════════════
        const ann8 = Array.isArray(fd._ann8_photos) ? fd._ann8_photos : [];
        if (ann8.length) {
            y = newPage();
            // Heading
            bold(11);
            const ann8Title = 'Annexure-VIII: Status in Area Master Plan';
            doc.text(ann8Title, ML, y + 5);
            const ann8TitleW = doc.getTextWidth(ann8Title);
            doc.setLineWidth(0.3);
            doc.line(ML, y + 6.5, ML + ann8TitleW, y + 6.5);
            y += 14;

            const imgW = 158, imgH = 178;
            const imgX = ML + (CW - imgW) / 2;
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
            try {
                const fmt2 = ann8[0].dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(ann8[0].dataUrl, fmt2, imgX, y, imgW, imgH);
            } catch(e) {
                doc.setFillColor(230, 230, 230);
                doc.rect(imgX, y, imgW, imgH, 'FD');
            }
            doc.rect(imgX, y, imgW, imgH);

            // Caption below image
            const cap8 = ann8[0].caption || ann8[0].name.replace(/\.[^/.]+$/, '');
            const cap8Lines = doc.splitTextToSize(cap8, imgW);
            italic(9);
            doc.text(cap8Lines, ML + CW / 2, y + imgH + 4.5, { align: 'center' });
        }

        // Save (was E.save())
        const filename = 'EBL_SME_Land_' + (v('reference_account_name') || v('letter_ref') || 'Report') + '.pdf';
        if (mode === 'preview') {
            return doc.output('bloburl');
        } else {
            doc.save(filename);
        }
    }
};