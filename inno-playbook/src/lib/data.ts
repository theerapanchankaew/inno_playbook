export const CAPS = [
  {id:'C1',name:'Value Creation System',day:1,dayLabel:'Day 1 · Mod 1–3',
   color:'#0B7B74',bg:'#E6F7F6',
   gps:{task:'Workshop: Innovation System Diagnostic + Value Creation Canvas',instr:'ทำ 3 ขั้นตอน: (1) ประเมิน Current State (2) ออกแบบ Value Canvas (3) วิเคราะห์ Context & Opportunity',timer:'Day 1',step:'Module 1–3 · 5.25 hrs'},
   isoRef:'4.1·4.2·4.3.1·5.1.2·6.2',
   playbookSection:'Innovation System Canvas & Value Creation Blueprint',
   exercise:{title:'Innovation System Diagnostic + Value Creation Canvas',dur:'45+90+120 min',fmt:'Individual → Groups (3-4) → Peer Review',
     desc:'ผ่าน 3 ขั้นตอน: (1) ประเมิน Innovation System ปัจจุบัน (2) ออกแบบ Value Creation Canvas จากนวัตกรรมจริงหรือสมมติ (3) วิเคราะห์ Context & Opportunity พร้อม PESTLE\n\nCase Study: Healthcare Digital Transformation — โรงพยาบาลที่ implement AI diagnostic systems',
     qs:['องค์กรของคุณมองนวัตกรรมเป็น Activity หรือ Capability? มีหลักฐานอะไร?','ใคร (stakeholders) คือผู้รับ Value? Value flows อย่างไร?','ปัจจัย External ใดกำหนด Opportunity Space? (PESTLE)','Innovation Intent ขององค์กรคุณคืออะไร? Align กับ Strategy อย่างไร?','Critical Assumptions ที่ยังไม่ได้ทดสอบคืออะไร?']},
   example:{title:'ตัวอย่าง: TechManufacturing Co. (จาก Appendix 1)',
     content:`INNOVATION SYSTEM ASSESSMENT
องค์กร: TechManufacturing Co. (Manufacturing)

Current State:
• Innovation เป็น project-based ไม่มี systematic capability building
• Decision-making เป็น ad-hoc ขึ้นอยู่กับ senior leadership availability
• ไม่มี portfolio management — resource allocation เป็นแบบ reactive
• Learning จาก failed projects ไม่สม่ำเสมอ ไม่ได้ document

Priority Gaps:
1. Decision Architecture (C3) — ต้องการ clear governance & stage-gates
2. Portfolio Thinking (C4) — ต้องการ systematic resource allocation
3. Knowledge Mgmt (C6) — ต้องการ capture & share learnings

INNOVATION INTENT STATEMENT:
"TechManufacturing Co. มุ่งสร้าง value ผ่านนวัตกรรมที่ systematic 
เพื่อลดต้นทุนการผลิต 15% และเปิดตลาดใหม่ใน 3 ปี โดยใช้
Digital & Process Innovation เป็น primary vehicle"`},
   deliverables:[
     {id:'c1_assess',lbl:'Innovation System Assessment',req:true,hint:'Current State + Priority Gaps 3-5 ด้าน',ph:'Current State ของ Innovation System:\n\nPriority Capability Gaps:\n1. \n2. \n3. '},
     {id:'c1_canvas',lbl:'Value Creation Blueprint (Canvas)',req:true,hint:'Stakeholders + Value propositions + Resources + Outcomes',ph:'Stakeholders & Value Flows:\n\nCore Value Propositions:\n\nKey Resources:\n\nCritical Assumptions:'},
     {id:'c1_context',lbl:'Context & Opportunity Analysis',req:true,hint:'PESTLE + Interested parties + Opportunities',ph:'External Context (PESTLE):\n- Political:\n- Economic:\n- Social:\n- Technology:\n- Legal:\n- Environment:\n\nInternal Context:\n\nInterested Parties:'},
     {id:'c1_intent',lbl:'Innovation Intent Statement',req:true,hint:'Purpose + Scope + Value ambition aligned to Strategy',ph:'Innovation Intent ขององค์กร [ชื่อ] คือ...\n\nเราจะ create value โดย...\n\nขอบเขต (Scope):\n\nความเชื่อมโยงกับ Strategy:'},
   ],
   isoMap:[
     {cl:'4.1',title:'Context of the organization',notes:'ระบุ organizational issues และ opportunity spaces สำหรับ value realization'},
     {cl:'4.2',title:'Interested parties',notes:'Stakeholder value mapping กำหนด relevant interested parties และ needs'},
     {cl:'4.3.1',title:'Innovation intent',notes:'Innovation Intent Statement articulates value creation ambition'},
     {cl:'5.1.2',title:'Focus on value realization',notes:'Ensures sustained focus on value realization under uncertainty'},
     {cl:'6.2',title:'Innovation objectives',notes:'Value Creation Blueprint defines objectives linked to value propositions'},
   ]},
  {id:'C2',name:'Uncertainty Mgmt & Learning',day:1,dayLabel:'Day 2 · Mod 4',
   color:'#2563EB',bg:'#EFF6FF',
   gps:{task:'Workshop: Assumption Testing & Experiment Design',instr:'ระบุ Critical Assumptions → ออกแบบ Experiments → กำหนด Learning Metrics',timer:'Day 2',step:'Module 4 · 90 min'},
   isoRef:'6.1·8.3·8.3.4·10.1',
   playbookSection:'Learning & Experimentation Framework',
   exercise:{title:'Assumption Testing Workshop',dur:'90 min',fmt:'Small Groups · Real Initiatives',
     desc:'กลุ่มระบุ Critical Assumptions ออกแบบ Minimum Viable Experiments และกำหนด Learning Metrics\n\nKnightian Uncertainty: Risk (known probability) vs Uncertainty (unknown probability)',
     qs:['Assumptions ใดที่ถ้าผิดจะทำให้ Innovation ล้มเหลวทั้งหมด?','จะออกแบบ Experiment ที่ถูก เร็ว และเรียนรู้ได้มากที่สุดอย่างไร?','Learning Loop ทำงานอย่างไร? feedback กลับสู่ decision อย่างไร?','องค์กรมี Psychological Safety ให้ fail fast and learn ไหม?','Kill/Pivot/Persevere — criteria สำหรับตัดสินใจแต่ละทางคืออะไร?']},
   example:{title:'ตัวอย่าง: Assumption Register & Experiment Design',
     content:`ASSUMPTION REGISTER
A-01 | ลูกค้าพร้อมจ่าย premium 20% สำหรับ AI diagnostics | High | Untested
A-02 | Medical staff ยอมรับ AI recommendation | High | Untested  
A-03 | ROI คุ้มทุนใน 18 เดือน | Medium | Partially tested

EXPERIMENT 1:
Assumption: A-01 — Willingness to pay
Method: Survey 50 ผู้ป่วย + 10 โรงพยาบาล (Price sensitivity test)
Duration: 4 สัปดาห์
Success Criteria: ≥60% indicate acceptable at +15-20% price
Resources: Research team 2 คน + Survey tool`},
   deliverables:[
     {id:'c2_assump',lbl:'Assumption Register',req:true,hint:'Critical assumptions + criticality level',ph:'ID | Description | Criticality | Status\nA-01 | | High | Untested\nA-02 | | |'},
     {id:'c2_exp',lbl:'Experiment Design Canvas (3-5 exp)',req:true,hint:'Assumption → Method → Duration → Success Criteria',ph:'Experiment 1:\n- Assumption:\n- Method:\n- Duration:\n- Success Criteria:\n\nExperiment 2:'},
     {id:'c2_learn',lbl:'Learning Dashboard Template',req:true,hint:'Key Questions + Evidence Criteria + Kill/Pivot triggers',ph:'Key Learning Questions:\n1. \n2. \n\nKill/Pivot/Scale Triggers:\n- KILL: เมื่อ...\n- PIVOT: เมื่อ...\n- SCALE: เมื่อ...'},
   ],
   isoMap:[
     {cl:'6.1',title:'Risks and opportunities',notes:'Assumption-driven experimentation จัดการ innovation uncertainty'},
     {cl:'8.3',title:'Innovation processes',notes:'Learning loops embedded เพื่อลด uncertainty'},
     {cl:'8.3.4',title:'Validate concepts',notes:'Validation activities สร้าง evidence-based learning'},
     {cl:'10.1',title:'Continual improvement',notes:'Learning outcomes ขับเคลื่อน continual improvement'},
   ]},
  {id:'C3',name:'Decision Architecture',day:2,dayLabel:'Day 2 · Mod 5',
   color:'#7C3AED',bg:'#F5F3FF',
   gps:{task:'Workshop: Decision Gate Design',instr:'ออกแบบ Multi-gate process → Gate criteria → RACI matrix',timer:'Day 2',step:'Module 5 · 2 hrs'},
   isoRef:'4.4·5.1.1·5.2·5.5·8.1·9.2·9.3',
   playbookSection:'Decision Architecture Blueprint',
   exercise:{title:'Decision Gate Design',dur:'2 hrs',fmt:'Individual Design + Group Critique',
     desc:'ออกแบบ Multi-gate Decision Architecture กำหนด Gate Criteria, Evidence Requirements, Decision Makers และ Escalation Procedures\n\nKill-Pivot-Scale Framework: KILL เมื่อ 2+ critical assumptions ผิด | PIVOT เมื่อ learnings แนะนำทิศทางใหม่ | SCALE เมื่อ gate criteria ครบและ ROI เป็นบวก',
     qs:['Stage-Gate, Agile, หรือ Lean — รูปแบบใดเหมาะกับ context ขององค์กร?','Evidence อะไรที่ต้องการที่แต่ละ Gate ก่อน Go/Kill?','ใครมี Decision Rights? มี separation ระหว่าง decision และ execution?','Kill decision ควรเกิดเมื่อใด? มีความกล้าที่จะ Kill ไหม?','RACI matrix สำหรับ Innovation Governance ควรเป็นอย่างไร?']},
   example:{title:'ตัวอย่าง: Decision Architecture (จาก Appendix 1)',
     content:`INNOVATION PROCESS WITH DECISION GATES:

Stage        | Gate | Key Criteria                  | Decision Maker
Ideation     | G0   | Strategic fit, Feasibility    | Innovation Manager
Concept      | G1   | Value prop, Market validation | Innovation Committee  
Development  | G2   | Financial viability, Tech fit  | Executive Team
Testing      | G3   | Market readiness, ROI          | C-Suite
Launch       | G4   | Performance vs target          | Product Council

KILL-PIVOT-SCALE FRAMEWORK:
• KILL: เมื่อ 2+ critical assumptions invalidated หรือ strategic fit หายไป
• PIVOT: เมื่อ learnings แนะนำ value proposition หรือ market ที่แตกต่าง
• SCALE: เมื่อ criteria ครบทุก gate และ positive ROI demonstrated`},
   deliverables:[
     {id:'c3_process',lbl:'Innovation Process Map + Decision Gates',req:true,hint:'Stage → Gate → Criteria → Decision Maker',ph:'Stage 1: Ideation → Gate 0\n- Criteria:\n- Decision Maker:\n- Evidence required:\n\nStage 2: Concept → Gate 1\n- Criteria:\n\nStage 3: Development → Gate 2'},
     {id:'c3_criteria',lbl:'Gate Criteria Matrix (Go/Kill/Pivot)',req:true,hint:'แต่ละ Gate: conditions + Kill-Pivot-Scale triggers',ph:'Gate 0: Go when: | Kill when: | Pivot when:\nGate 1: Go when: | Kill when: | Pivot when:\n\nKill-Pivot-Scale:\n- KILL: เมื่อ...\n- PIVOT: เมื่อ...\n- SCALE: เมื่อ...'},
     {id:'c3_raci',lbl:'RACI Matrix for Innovation Governance',req:true,hint:'R=Responsible A=Accountable C=Consulted I=Informed',ph:'Activity            | Innov.Team | Committee | Executive | Finance\nGate Decision       |            | A         |           |\nBudget Approval     |            |           | A         |\nKill Decision       | C          | R         | A         | I'},
   ],
   isoMap:[
     {cl:'4.4',title:'IMS established',notes:'Decision architecture กำหนดวิธีที่ IMS ถูก govern และ control'},
     {cl:'5.1.1',title:'Leadership accountability',notes:'Leadership commitment แสดงผ่าน clear decision rights'},
     {cl:'5.5',title:'Roles and authorities',notes:'Decision ownership และ authority ถูก explicitly assigned'},
     {cl:'8.1',title:'Operational planning',notes:'Decision criteria ควบคุม innovation initiatives'},
     {cl:'9.2',title:'Internal audit',notes:'Audit focuses on decision logic และ governance effectiveness'},
   ]},
  {id:'C4',name:'Portfolio Thinking',day:2,dayLabel:'Day 2 · Mod 6',
   color:'#D97706',bg:'#FFFBEB',
   gps:{task:'Workshop: Portfolio Mapping & Balancing',instr:'Map initiatives ข้าม Horizons → ประเมิน Balance → Resource Allocation',timer:'Day 2',step:'Module 6 · 2 hrs'},
   isoRef:'5.3·6.4·7.1.4·8.2',
   playbookSection:'Portfolio Management Strategy',
   exercise:{title:'Portfolio Mapping & Balancing',dur:'2 hrs',fmt:'Group Simulation',
     desc:'ใช้ Simulated Portfolio กลุ่ม map initiatives ข้าม Horizons ประเมิน Balance และทำ Resource Allocation decisions ภายใต้ constraints\n\nTarget: H1:H2:H3 = 70%:20%:10%',
     qs:['Portfolio ปัจจุบัน H1:H2:H3 เป็นอย่างไร? เหมาะสมไหม?','Criteria อะไรใช้ Prioritize initiatives?','Ambidexterity — ทำ Core และ Explore พร้อมกันอย่างไร?','Portfolio Review บ่อยแค่ไหน? ใครเข้าร่วม?','เมื่อ Resource ขาด หยุด initiative ไหนก่อน?']},
   example:{title:'ตัวอย่าง: Innovation Metrics Dashboard (จาก Appendix 1)',
     content:`PORTFOLIO MAP — TechManufacturing Co.

H1 (Core — 65%):
• Process automation ERP upgrade
• Quality control AI implementation  

H2 (Adjacent — 25%):
• New product line: sustainable packaging
• Digital service platform for B2B clients

H3 (Transformational — 10%):
• Advanced materials R&D partnership
• Industry 4.0 smart factory pilot

Current vs Target Balance:
Current: H1=65% H2=25% H3=10% → Close to target 70:20:10`},
   deliverables:[
     {id:'c4_map',lbl:'Innovation Portfolio Map',req:true,hint:'Initiatives ข้าม Horizons + current vs target balance',ph:'H1 Initiatives (Core ~70%):\n- \n\nH2 Initiatives (Adjacent ~20%):\n- \n\nH3 Initiatives (Transform ~10%):\n- \n\nCurrent: H1=__% H2=__% H3=__%\nTarget: H1=__% H2=__% H3=__%'},
     {id:'c4_alloc',lbl:'Allocation Principles + Funding Model',req:true,hint:'% allocation + rationale + investment principles',ph:'Target Allocation:\n- H1: ___% — เหตุผล:\n- H2: ___% — เหตุผล:\n- H3: ___% — เหตุผล:\n\nPrioritization Criteria:\n1. \n2. \n\nPortfolio Review Cadence:'},
   ],
   isoMap:[
     {cl:'5.3',title:'Innovation strategy',notes:'Strategy operationalize ผ่าน portfolio logic'},
     {cl:'6.4',title:'Innovation portfolio',notes:'Portfolio structures balance risk, learning, และ value creation'},
     {cl:'7.1.4',title:'Finance',notes:'Resource allocation ตาม portfolio-based investment principles'},
     {cl:'8.2',title:'Innovation initiatives',notes:'Initiatives prioritize และ manage เป็น integrated portfolio'},
   ]},
  {id:'C5',name:'Capability Building',day:3,dayLabel:'Day 3 · Mod 7',
   color:'#059669',bg:'#ECFDF5',
   gps:{task:'Workshop: Capability Development Roadmap',instr:'Gap analysis → Target operating model → 12-18 month roadmap',timer:'Day 3',step:'Module 7 · 90 min'},
   isoRef:'5.1.3·6.5·6.6·7.1·7.2',
   playbookSection:'Capability Development Roadmap',
   exercise:{title:'Capability Development Roadmap Design',dur:'90 min',fmt:'Individual + Peer Review',
     desc:'ออกแบบ 12-18 Month Capability Roadmap: Ways of Working ที่จะ establish, Org Structure adjustments, Collaboration initiatives\n\nKey Insight: Capability ≠ Training = Practices + Rituals + Routines ที่ embed ใน organization',
     qs:['ความแตกต่างระหว่าง Competence (individual) กับ Capability (organizational)?','Ways of Working ใดต้องสร้างหรือเปลี่ยนเพื่อ embed innovation capability?','โครงสร้างองค์กรปัจจุบัน support หรือ hinder innovation?','Collaboration ใน/นอกองค์กรจะออกแบบอย่างไร?','Milestones ที่ realistic สำหรับ 3, 6, 12, 18 เดือน?']},
   example:{title:'ตัวอย่าง: Capability Gap Analysis',
     content:`CAPABILITY GAP ANALYSIS — TechManufacturing Co.

Capability         | Current | Target | Gap Action
C1 Value Creation  | 2/5     | 4/5    | Value mapping workshop Q1
C2 Uncertainty     | 1/5     | 4/5    | Experiment culture training
C3 Decision Arch   | 1/5     | 5/5    | Stage-gate process design
C4 Portfolio       | 2/5     | 4/5    | Portfolio review cadence
C5 Capability      | 2/5     | 4/5    | Ways of working redesign
C6 Knowledge       | 1/5     | 3/5    | KM system implementation
C7 Metrics         | 2/5     | 4/5    | Dashboard design
C8 Culture         | 2/5     | 4/5    | Culture program launch`},
   deliverables:[
     {id:'c5_gap',lbl:'Capability Gap Analysis (C1-C8)',req:true,hint:'Current vs Target maturity per capability',ph:'C1 Value Creation: Current _/5 → Target _/5\nC2 Uncertainty: Current _/5 → Target _/5\nC3 Decision: Current _/5 → Target _/5\nC4 Portfolio: Current _/5 → Target _/5\nC5 Capability: Current _/5 → Target _/5\nC6 Knowledge: Current _/5 → Target _/5\nC7 Metrics: Current _/5 → Target _/5\nC8 Culture: Current _/5 → Target _/5'},
     {id:'c5_model',lbl:'Target Operating Model + Ways of Working',req:true,hint:'Structure + Key roles + Practices & rituals',ph:'Innovation Structure: [dedicated / dual / network]\n\nKey Roles:\n- Innovation Lead:\n- Champion:\n\nWays of Working:\n1. \n2. \n3. '},
     {id:'c5_roadmap',lbl:'Phased Implementation Plan (12-18 Months)',req:true,hint:'Month 1-3, 4-6, 7-12, 13-18 milestones',ph:'Phase 1 (M1-3) Foundation:\nMilestones:\n\nPhase 2 (M4-6) Build:\nMilestones:\n\nPhase 3 (M7-12) Embed:\nMilestones:\n\nPhase 4 (M13-18) Scale:'},
   ],
   isoMap:[
     {cl:'5.1.3',title:'Change management',notes:'Capability building enables organizational readiness for change'},
     {cl:'6.5',title:'Organizational structures',notes:'Structures designed เพื่อ support innovation capability'},
     {cl:'7.1',title:'Resources',notes:'Resources allocated เพื่อ build และ sustain capability'},
     {cl:'7.2',title:'Competence',notes:'Competence requirements embedded into ways of working'},
   ]},
  {id:'C6',name:'Knowledge → System Memory',day:3,dayLabel:'Day 3 · Mod 8',
   color:'#0284C7',bg:'#F0F9FF',
   gps:{task:'Workshop: Knowledge Management System Design',instr:'Lifecycle design → Capture mechanisms → Repository structure → Continuous improvement loop',timer:'Day 3',step:'Module 8 · 90 min'},
   isoRef:'7.1.6·7.5·8.3·10.1·10.2',
   playbookSection:'Knowledge Management System',
   exercise:{title:'KM System Design',dur:'90 min',fmt:'Small Groups',
     desc:'กลุ่มออกแบบ KM System: Identify → Capture → Classify → Protect → Share → Use\nรวมถึง Post-project reviews และ Continuous learning mechanisms',
     qs:['Innovation knowledge ประเภทใด "สูญหาย" บ่อยที่สุด?','Post-mortem ควรทำเมื่อใด รูปแบบใดได้ผล?','Repository structure ที่ใช้ได้จริง (ค้นหาง่าย) หน้าตาเป็นอย่างไร?','ใคร maintain organizational memory?','Continuous Improvement Loop — Learning → Action เชื่อมกันอย่างไร?']},
   example:{title:'ตัวอย่าง: Post-Project Review Template',
     content:`POST-PROJECT REVIEW TEMPLATE

Project: AI Diagnostic Pilot (completed Q3 2024)
Date: October 15, 2024 | Owner: Innovation Team

1. What did we intend to do?
   → Validate AI accuracy ≥90% with 100 test cases

2. What actually happened?
   → Accuracy 87% — below threshold
   → Medical staff adoption lower than expected (60% vs 85% target)

3. Why the difference?
   → Training data was from different hospital profile
   → Change management insufficient — staff not involved in design

4. What will we do differently?
   → Include clinicians in co-design from Day 1
   → Use local training data, minimum 500 cases

KNOWLEDGE CLASSIFIED AS: Lesson Learned — High Priority — Share to all future AI projects`},
   deliverables:[
     {id:'c6_framework',lbl:'KM Framework (Identify→Use lifecycle)',req:true,hint:'6-step lifecycle + types of knowledge to manage',ph:'IDENTIFY: ประเภท Knowledge:\n\nCAPTURE: วิธีการและเครื่องมือ:\n\nCLASSIFY: Categories:\n\nPROTECT: Confidentiality levels:\n\nSHARE: Channels:\n\nUSE: How it informs decisions:'},
     {id:'c6_capture',lbl:'Learning Capture Mechanisms',req:true,hint:'Post-project review template + frequency + owner',ph:'Post-Project Review Template:\n1. What intended?\n2. What happened?\n3. Why different?\n4. What next time?\n\nCapture Frequency:\nOwner:\nStorage:'},
     {id:'c6_repo',lbl:'Repository Structure & Access Policy',req:false,hint:'Folder structure + access levels',ph:'/Innovation\n  /Lessons_Learned\n  /Experiments\n  /Best_Practices\n\nAccess Levels:\n- All staff:\n- Innovation team:\n- Leadership:'},
   ],
   isoMap:[
     {cl:'7.1.6',title:'Knowledge',notes:'KM system captures และ reuses learning'},
     {cl:'7.5',title:'Documented information',notes:'Learning records maintained เป็น documented information'},
     {cl:'10.1',title:'Continual improvement',notes:'System-level learning ขับเคลื่อน continual improvement'},
     {cl:'10.2',title:'Nonconformity & CA',notes:'Root causes addressed at system level'},
   ]},
  {id:'C7',name:"Metrics That Don't Kill Innovation",day:3,dayLabel:'Day 3 · Mod 9',
   color:'#DC2626',bg:'#FEF2F2',
   gps:{task:'Workshop: Innovation Metrics Dashboard Design',instr:'ออกแบบ Balanced Scorecard → Leading + Lagging → Targets → Review cadence',timer:'Day 3',step:'Module 9 · 90 min'},
   isoRef:'6.2·9.1·9.3',
   playbookSection:'Innovation Metrics Dashboard',
   exercise:{title:'Innovation Metrics Dashboard Design',dur:'90 min',fmt:'Individual + Group Critique',
     desc:'ออกแบบ Balanced Innovation Metrics Dashboard ด้วย Leading และ Lagging Indicators\n\nMeasurement Paradox: Metrics ที่วัดผิดสามารถ kill innovation ได้ — ต้อง balance ระหว่าง control และ experimentation freedom',
     qs:['Metrics ใดที่องค์กรวัดอยู่อาจ "kill" innovation โดยไม่ตั้งใจ?','Input, Process, Output, Outcome ต่างกันอย่างไร? ควรเน้นอะไร?','Leading Indicators สำคัญกว่า Lagging อย่างไร?','Target ที่ realistic สำหรับ Innovation Metrics คืออะไร?','เมื่อ Metric ต่ำกว่า target ควร trigger action อะไร?']},
   example:{title:'ตัวอย่าง: Innovation Metrics Dashboard (จาก Appendix 1)',
     content:`INNOVATION METRICS DASHBOARD

Category  | Metric                              | Target
INPUT     | % revenue to innovation             | 5-8%
INPUT     | # people with innovation time       | 20% workforce
PROCESS   | Experimentation velocity (exp/Q)    | 15-20
PROCESS   | Avg time per decision gate          | <30 days
PROCESS   | % projects with post-mortem         | 100%
OUTPUT    | # validated concepts/year           | 8-10
OUTPUT    | Portfolio H1:H2:H3                  | 70:20:10
OUTCOME   | Revenue from innovations <3yr       | 15% of total
OUTCOME   | Customer value realization score    | >8/10`},
   deliverables:[
     {id:'c7_scorecard',lbl:'Balanced Scorecard (12-15 Metrics)',req:true,hint:'Input / Process / Output / Outcome + Target',ph:'INPUT (C5):\n1. % revenue to innovation: Target ___\n2. # people with innovation time: Target ___\n\nPROCESS (C2,C3):\n3. Experimentation velocity: Target ___\n4. Gate decision time: Target <___\n\nOUTPUT (C1,C4):\n5. Validated concepts/year: Target ___\n\nOUTCOME (C1):\n6. Revenue from new innovations: Target ___'},
     {id:'c7_defs',lbl:'Metric Definition Sheets (3-5 key metrics)',req:true,hint:'Purpose + Calculation + Target + Frequency + Owner',ph:'METRIC 1: [ชื่อ]\nPurpose:\nCalculation:\nData Source:\nTarget:\nFrequency:\nOwner:\n\nMETRIC 2:'},
   ],
   isoMap:[
     {cl:'6.2',title:'Innovation objectives',notes:'Objectives ถูก define ด้วย measurable indicators'},
     {cl:'9.1',title:'Monitoring and measurement',notes:'Balanced metrics monitor innovation performance'},
     {cl:'9.3',title:'Management review',notes:'Metrics ให้ evidence สำหรับ management review'},
   ]},
  {id:'C8',name:'Culture by Design',day:3,dayLabel:'Day 3 · Mod 10',
   color:'#BE185D',bg:'#FDF2F8',
   gps:{task:'Workshop: Culture Plan + ISO 56001 Capstone',instr:'Culture principles → Leadership behaviors → Rituals → Communication → Integrate C1-C8 เป็น Playbook',timer:'Day 3',step:'Module 10 · Capstone · 90 min'},
   isoRef:'5.4·5.1.1·7.3·7.4',
   playbookSection:'Culture Transformation Plan',
   exercise:{title:'Culture Transformation Plan + ISO 56001 Capstone',dur:'90 min',fmt:'Individual + Peer Presentations (5 min)',
     desc:'ออกแบบ Culture Transformation Plan ผ่าน leadership behaviors, organizational rituals, communication\n\nCapstone: นำ C1-C8 ทั้งหมด integrate เป็น Innovation Playbook และนำเสนอ (5 นาที)\n\n💡 Tips สำหรับ 5-min Presentation: Context (30s) → System (1m) → Decision+Portfolio (1m) → Capabilities (1m) → Culture+Metrics (1m) → Ask (30s)',
     qs:['Innovation culture ที่ต้องการคืออะไร? วัดได้อย่างไร?','Leaders ต้อง role-model behaviors ใด?','Rituals ใด embed innovation culture ใน daily work?','Communication strategy จะ build shared understanding อย่างไร?','สิ่งที่ยากที่สุดในการ change culture ขององค์กรคุณคืออะไร?']},
   example:{title:'ตัวอย่าง: Innovation Culture Principles',
     content:`INNOVATION CULTURE PRINCIPLES

1. "Celebrate learning, not just winning"
   Leaders model by: Sharing own failures in town halls

2. "Assumptions are our friends — test them fast"
   Leaders model by: Asking "what's our assumption?" before approving budgets

3. "Kill fast, learn faster"
   Leaders model by: Praising teams that stop bad projects early

4. "Ideas from everywhere"
   Leaders model by: Responding to all innovation suggestions within 5 days

WEEKLY RITUAL: "Experiment Friday" — 15-min standup
- 1 thing we tested this week
- 1 thing we learned (even if failed)
- 1 thing we'll try next week`},
   deliverables:[
     {id:'c8_principles',lbl:'Culture Principles + Leadership Behaviors',req:true,hint:'4-6 principles + behaviors leaders must model',ph:'Principles:\n1. [Principle] — Leaders model by:\n2. \n3. \n4. \n\nBehaviors to Reinforce:\n\nBehaviors to Discourage:'},
     {id:'c8_rituals',lbl:'Innovation Rituals & Routines',req:true,hint:'Daily / Weekly / Monthly practices ที่ embed culture',ph:'Weekly Rituals:\n- [Ritual name]: ทำอะไร, ใครเข้า, ผลที่ได้\n\nMonthly Routines:\n- Innovation Show & Tell:\n\nQuarterly:\n- '},
     {id:'c8_comms',lbl:'Awareness & Communication Plan',req:true,hint:'Channels + Messages + Frequency',ph:'Key Messages:\n1. \n\nChannels:\n- Town halls:\n- Newsletter:\n\nAwareness Activities:\n- Onboarding:\n- Training:'},
   ],
   isoMap:[
     {cl:'5.4',title:'Innovation culture',notes:'Culture intentionally promoted ผ่าน leadership และ system design'},
     {cl:'5.1.1',title:'Leadership accountability',notes:'Leaders role-model behaviors ที่ support innovation'},
     {cl:'7.3',title:'Awareness',notes:'Awareness activities reinforce shared understanding'},
     {cl:'7.4',title:'Communication',notes:'Communication enables sense-making ทั่วองค์กร'},
   ]},
];

export const EVIDENCE = {
  '4':[{cl:'4.1',ev:'Context analysis',doc:'Context report; review notes',cap:'C1',store:'Strategy / IMS',checks:['Updated','Relevant','Used in decisions']},{cl:'4.2',ev:'Interested parties',doc:'Stakeholder register',cap:'C1',store:'IMS repository',checks:['Needs addressed','Reviewed']},{cl:'4.3.1',ev:'Innovation intent',doc:'Intent statement; approval',cap:'C1',store:'Doc control',checks:['Approved','Communicated']},{cl:'4.4',ev:'IMS established',doc:'IMS description',cap:'C3',store:'IMS repository',checks:['Implemented','Maintained']}],
  '5':[{cl:'5.1.1',ev:'Leadership accountability',doc:'RACI; decision logs',cap:'C3',store:'Governance',checks:['Decisions traceable']},{cl:'5.2',ev:'Innovation policy',doc:'Approved policy; comms',cap:'C3',store:'DMS',checks:['Approved','Known']},{cl:'5.3',ev:'Innovation strategy',doc:'Strategy doc; review',cap:'C4',store:'Strategy repo',checks:['Aligned to portfolio']},{cl:'5.4',ev:'Innovation culture',doc:'Culture principles; actions',cap:'C8',store:'HR / IMS',checks:['Demonstrated']},{cl:'5.5',ev:'Roles & authorities',doc:'RACI; delegation',cap:'C3',store:'Governance',checks:['Clear authority']}],
  '6':[{cl:'6.1',ev:'Risks & opportunities',doc:'Assumption logs',cap:'C2',store:'Experiment repo',checks:['Risks addressed']},{cl:'6.2',ev:'Innovation objectives',doc:'Objectives; KPI tracking',cap:'C7',store:'Dashboard',checks:['Measured']},{cl:'6.4',ev:'Innovation portfolio',doc:'Portfolio map; reviews',cap:'C4',store:'Portfolio system',checks:['Balanced']},{cl:'6.5',ev:'Org structure',doc:'Structure design',cap:'C5',store:'HR system',checks:['Fit for innovation']},{cl:'6.6',ev:'Collaboration',doc:'Partner framework',cap:'C5',store:'Partner mgmt',checks:['Managed']}],
  '7':[{cl:'7.1',ev:'Resources',doc:'Resource plans',cap:'C5',store:'Finance / IMS',checks:['Adequate']},{cl:'7.1.6',ev:'Knowledge',doc:'KM framework; records',cap:'C6',store:'Knowledge repo',checks:['Used']},{cl:'7.2',ev:'Competence',doc:'Competence records',cap:'C5',store:'HR / LMS',checks:['Verified']},{cl:'7.3',ev:'Awareness',doc:'Awareness records',cap:'C8',store:'HR / Comms',checks:['Aware']},{cl:'7.4',ev:'Communication',doc:'Comms records',cap:'C8',store:'Comms platform',checks:['Effective']},{cl:'7.5',ev:'Documented info',doc:'Doc control procedure',cap:'C3',store:'DMS',checks:['Controlled']}],
  '8':[{cl:'8.1',ev:'Operational control',doc:'Control criteria; decisions',cap:'C3',store:'IMS / Portfolio',checks:['Controlled']},{cl:'8.3',ev:'Innovation processes',doc:'Process framework; records',cap:'C2',store:'Process repo',checks:['Followed']},{cl:'8.3.4',ev:'Validate concepts',doc:'Experiment results',cap:'C2',store:'Experiment repo',checks:['Evidence-based']},{cl:'8.3.6',ev:'Deployment & value',doc:'Deployment results',cap:'C1',store:'Business system',checks:['Value realized']}],
  '9':[{cl:'9.1',ev:'Monitoring & measurement',doc:'Metrics dashboard',cap:'C7',store:'Analytics',checks:['Reviewed']},{cl:'9.2',ev:'Internal audit',doc:'Audit program; reports',cap:'C3',store:'Audit system',checks:['Conducted']},{cl:'9.3',ev:'Management review',doc:'Review minutes; actions',cap:'C3',store:'Management records',checks:['Actions tracked']}],
  '10':[{cl:'10.1',ev:'Continual improvement',doc:'Improvement actions',cap:'C6',store:'Improvement log',checks:['Implemented']},{cl:'10.2',ev:'Nonconformity & CA',doc:'CA records',cap:'C6',store:'CAPA system',checks:['Closed']}]
};
