// 為每個學科補上「香港就業前景與方向」詳細分析，寫入 disciplines.json（後端 + 前端）。
// 內容按香港實際經濟、行業結構、未來發展撰寫（非爬取，較可靠準確）。
import fs from 'fs';
import path from 'path';

const CAREER_HK = {
  medicine: {
    zh: '香港醫生長期短缺、需求極穩定，公私營醫院、診所皆求才若渴，起薪與社會地位高。人口老化令醫療需求持續上升，前景明朗；惟培訓年期長、競爭最激烈，須有長線投入的準備。',
    en: 'Hong Kong faces a chronic doctor shortage; demand is extremely stable across public and private hospitals, with high starting pay and status. An ageing population keeps demand rising, so prospects are excellent — but training is long and entry is the most competitive of all fields.',
  },
  dentistry: {
    zh: '牙醫在港供應少、需求穩定，私人執業收入高，公營與社區牙科亦有職位。人口老化及口腔保健意識上升支撐長遠需求，屬穩陣而回報高的專業。',
    en: 'Dentists are in limited supply and steady demand; private practice pays very well, with public and community roles too. Ageing and rising oral-health awareness support long-term demand — a stable, high-return profession.',
  },
  chinese_medicine: {
    zh: '隨首間中醫醫院啟用及政府逐步將中醫納入公營體系，中醫發展空間擴大，惟目前多為自僱或私人診所、收入分化較大，宜結合專科或科研提升競爭力。',
    en: 'With Hong Kong’s first Chinese-medicine hospital and gradual integration into the public system, prospects are broadening; however most practise privately or self-employed with varied income — specialising or research can boost competitiveness.',
  },
  nursing: {
    zh: '護士是全港最搶手的專業之一，公立醫院長期人手短缺，就業幾近百分百，且晉升與海外發展機會多。人口老化令需求只增不減，屬最穩陣、最易就業的醫療出路。',
    en: 'Nurses are among Hong Kong’s most sought-after professionals; public hospitals face persistent shortages, giving near-100% employment plus promotion and overseas options. Ageing guarantees rising demand — one of the safest, most employable healthcare paths.',
  },
  pharmacy: {
    zh: '藥劑師在醫院、社區藥房及製藥業均有需求，人口老化及慢性病增加帶動長遠需求，收入穩定；香港註冊藥劑師人數偏少，就業前景良好。',
    en: 'Pharmacists are needed in hospitals, community pharmacies and industry; ageing and chronic illness drive long-term demand with stable pay. Registered pharmacists remain relatively few, so employment prospects are good.',
  },
  physiotherapy: {
    zh: '物理治療、職業治療隨人口老化與康復服務擴張需求上升，公私營、安老及運動復康市場皆有機會，屬穩定成長的醫療專職。',
    en: 'Physiotherapy and occupational therapy demand is rising with ageing and expanding rehab services — opportunities span public, private, elderly-care and sports rehab. A steadily growing allied-health field.',
  },
  public_health: {
    zh: '公共衞生於疫後更受重視，出路包括政府衞生部門、醫管局、NGO、國際衞生組織及數據分析；適合有志於政策與人群健康者，惟需配合數據或專科技能。',
    en: 'Public health gained prominence post-pandemic; paths include government health units, the Hospital Authority, NGOs, international bodies and health-data analytics. Best paired with data or specialist skills for those keen on policy and population health.',
  },
  biomedical: {
    zh: '生物醫學結合科研與臨床應用，出路涵蓋醫療科技、藥廠、實驗室及研究；配合香港與大灣區生物科技投資（科學園、河套區），發展空間漸擴，惟起步多需研究生資歷。',
    en: 'Biomedical science bridges research and clinical application — medtech, pharma, labs and research. With Hong Kong/Greater Bay Area biotech investment (Science Park, Loop), scope is widening, though many roles need postgraduate qualifications.',
  },
  biotechnology: {
    zh: '生物科技是香港「創新科技」重點方向之一，科學園與河套深港科技園吸引藥廠與初創進駐，長遠潛力大；現階段本地職位仍在成長，研究或大灣區發展機會較多。',
    en: 'Biotech is a pillar of Hong Kong’s innovation-and-tech push; Science Park and the HK–Shenzhen Loop attract pharma and start-ups, giving strong long-term potential. Local roles are still growing, with more opportunity in research or across the Greater Bay Area.',
  },
  law: {
    zh: '法律屬高地位、高回報行業，商業、金融、仲裁與跨境法律在港需求強。惟入行須過 PCLL 及實習「樽頸」，競爭激烈；非執業出路（合規、法務、公職）亦廣。',
    en: 'Law is prestigious and well-paid, with strong demand in commercial, finance, arbitration and cross-border work. Entry faces the PCLL and training-contract bottleneck and is highly competitive; non-practising paths (compliance, in-house, civil service) are also broad.',
  },
  architecture: {
    zh: '建築師出路與地產及基建周期掛鈎，北部都會區與大型發展帶來機遇，惟需長時間考取專業資格。設計、項目管理、可持續建築為增長方向。',
    en: 'Architecture tracks the property and infrastructure cycle; the Northern Metropolis and major developments bring opportunity, though professional qualification takes years. Design, project management and sustainable building are growth areas.',
  },
  surveying: {
    zh: '測量師（產業、工料、土地）在地產、建造與政府部門需求穩定，專業資格認受性高、收入良好；與北部都會區及基建工程關係密切。',
    en: 'Surveyors (general practice, quantity, land) enjoy steady demand in property, construction and government, with a well-recognised qualification and good pay — closely tied to the Northern Metropolis and infrastructure works.',
  },
  civil_eng: {
    zh: '土木工程受惠於北部都會區、交通及基建大型項目，需求穩定；可考取工程師專業資格，晉升清晰。屬回報穩健、社會需求持續的工程主流。',
    en: 'Civil engineering benefits from the Northern Metropolis and major transport/infrastructure projects, with steady demand and a clear chartered-engineer path — a mainstream field with reliable returns and lasting need.',
  },
  mechanical_eng: {
    zh: '機械工程出路涵蓋屋宇設備（MEP）、製造、機電與能源，建造業及大灣區製造升級提供機會；屋宇裝備工程師在港需求尤其穩定。',
    en: 'Mechanical engineering spans building services (MEP), manufacturing, and energy; construction and Greater Bay Area manufacturing upgrades create demand, with building-services engineers especially sought after in Hong Kong.',
  },
  electrical_eng: {
    zh: '電機／電子工程於屋宇設備、電力、電訊及半導體皆有需求，配合智慧城市與新能源發展前景良好；MEP 與電力工程師就業穩定。',
    en: 'Electrical/electronic engineering is needed in building services, power, telecoms and semiconductors, with good prospects from smart-city and clean-energy development; MEP and power engineers enjoy stable employment.',
  },
  ai: {
    zh: '人工智能是香港「創科」核心，金融科技、Web3、智慧城市與 InnoHK 帶動需求，薪酬高、人才短缺，前景最被看好之一。建議累積實作項目與數據能力提升競爭力。',
    en: 'AI is central to Hong Kong’s innovation drive — fintech, Web3, smart city and InnoHK fuel demand, with high pay and a talent shortage, making it among the brightest prospects. Build hands-on projects and data skills to stand out.',
  },
  data_science: {
    zh: '數據科學跨金融、電商、醫療與政府，需求持續上升、薪酬優厚，是最具轉工彈性的技能之一。香港金融與創科發展令數據人才長期供不應求。',
    en: 'Data science spans finance, e-commerce, healthcare and government, with rising demand and strong pay — one of the most transferable skill sets. Hong Kong’s finance and tech growth keeps data talent in short supply.',
  },
  computer_science: {
    zh: '電腦科學就業廣且薪高，軟件、資訊保安、金融科技、雲端與 AI 均缺人。香港與大灣區創科投資持續，長遠需求強勁，是最穩健的理科出路之一。',
    en: 'Computer science offers broad, high-paying work — software, cybersecurity, fintech, cloud and AI all face shortages. Ongoing Hong Kong/Greater Bay Area tech investment keeps demand strong — one of the most reliable science paths.',
  },
  information_tech: {
    zh: '資訊科技（系統、資訊管理、網絡保安）於各行各業皆有需求，數碼轉型與資訊保安帶動職位增長，入行門檻與薪酬俱佳，就業穩定。',
    en: 'IT (systems, information management, cybersecurity) is needed across every sector; digital transformation and security drive job growth, with accessible entry, good pay and stable employment.',
  },
  accounting: {
    zh: '會計出路穩定，四大會計師行、企業財務及審計持續招聘，考取 HKICPA 認受性高。惟基礎核數受自動化影響，宜向財務分析、稅務諮詢、ESG 等增值方向發展。',
    en: 'Accounting offers stable careers — the Big Four, corporate finance and audit hire steadily, and the HKICPA qualification is highly regarded. Routine audit faces automation, so lean toward financial analysis, tax advisory and ESG.',
  },
  actuarial: {
    zh: '香港是保險樞紐，精算師薪酬高、需求穩定，但須通過一系列專業考試、屬窄而精的路。風險管理、財務科技擴闊了出路。',
    en: 'As an insurance hub, Hong Kong pays actuaries well with steady demand, though it requires passing a series of professional exams — a narrow but deep path. Risk management and fintech broaden the options.',
  },
  finance: {
    zh: '香港為國際金融中心，投資銀行、資產管理、私人銀行與金融科技機會多、回報高，但入行競爭激烈。合規、風險、量化與 ESG 金融為增長領域；大灣區財富管理帶來新機遇。',
    en: 'As an international financial centre, Hong Kong offers plentiful, high-reward roles in investment banking, asset and private wealth management, and fintech — but entry is fiercely competitive. Compliance, risk, quant and ESG finance are growing, with Greater Bay Area wealth management adding openings.',
  },
  economics: {
    zh: '經濟學訓練分析與量化思維，出路廣：金融、諮詢、政府、研究與數據分析皆可。配合統計、程式或財務技能，轉工彈性極高。',
    en: 'Economics builds analytical and quantitative thinking with broad exits — finance, consulting, government, research and data analytics. Paired with statistics, coding or finance skills, it is highly versatile.',
  },
  marketing: {
    zh: '市場營銷出路廣，數碼營銷、社交媒體、電商與品牌管理需求上升；行業重實戰與作品，累積實習與數據分析能力有助突圍。',
    en: 'Marketing offers wide paths, with rising demand in digital marketing, social media, e-commerce and brand management; the field rewards practical work — internships and data-analytics skills help you stand out.',
  },
  hospitality: {
    zh: '旅遊與款待隨旅遊業復甦及盛事經濟回暖，酒店、會展、主題公園需人；起薪一般但晉升快、國際化，管理層與大灣區／內地市場機會較佳。',
    en: 'Tourism and hospitality recover with the return of visitors and the events economy — hotels, MICE and theme parks need staff; entry pay is modest but progression is fast and international, with better prospects in management and the Greater Bay/mainland market.',
  },
  management: {
    zh: '管理／工商行政出路廣但較「通才」，實際發展視乎所選專長（營運、人力、供應鏈等）與實習經驗。宜及早鎖定專長並累積實務。',
    en: 'Management/business administration is broad but generalist; outcomes depend on your chosen specialism (operations, HR, supply chain) and internship experience. Pick a focus early and build practical exposure.',
  },
  psychology: {
    zh: '社會對精神健康日益重視，臨床、教育及工業組織心理學需求上升；惟臨床／教育心理學家須修讀碩士並考取資格，本科生多先入人力資源、研究或社福等相關崗位。',
    en: 'Rising mental-health awareness lifts demand in clinical, educational and organisational psychology; however clinical/educational psychologists need a master’s and registration, so graduates often start in HR, research or social services.',
  },
  social_work: {
    zh: '社工需求穩定，政府、NGO 與社福機構持續招聘，人口老化與家庭服務需求上升。註冊社工就業穩健，屬助人而有保障的出路。',
    en: 'Social work sees steady demand; government, NGOs and welfare bodies hire continuously, with ageing and family-service needs rising. Registered social workers enjoy stable employment — a secure, people-centred path.',
  },
  sociology: {
    zh: '社會學培養研究、政策與人本分析能力，出路含政府、研究、社福、傳媒、人力資源與市場研究；宜結合數據或專業技能提升就業競爭力。',
    en: 'Sociology builds research, policy and people-centred analysis, leading to government, research, welfare, media, HR and market research; pairing with data or professional skills strengthens employability.',
  },
  political_science: {
    zh: '政治與公共行政出路含公務員、政策研究、國際關係、NGO 與傳媒；適合關心公共事務者，配合語文與分析能力，亦可轉商界或諮詢。',
    en: 'Politics and public administration lead to the civil service, policy research, international affairs, NGOs and media; suited to those keen on public affairs, and — with language and analytical skills — transferable to business or consulting.',
  },
  journalism: {
    zh: '新聞業面對數碼轉型，傳統媒體收縮但內容、公關、企業傳訊與社交媒體需求增加；記者訓練的採寫與溝通力可靈活轉向多元傳播崗位。',
    en: 'Journalism faces digital disruption; traditional media shrinks while content, PR, corporate communications and social media grow — the reporting and communication skills transfer flexibly across media roles.',
  },
  communication: {
    zh: '傳播出路多元：公關、廣告、企業傳訊、社交媒體與內容製作。數碼與影音內容需求上升，重作品集與實戰經驗，適合善於溝通與創意者。',
    en: 'Communication offers varied paths — PR, advertising, corporate comms, social media and content production. Digital and video content demand is rising; the field values portfolios and hands-on experience, ideal for creative communicators.',
  },
  translation: {
    zh: '翻譯出路含商業、法律、政府、傳媒與本地化；AI 翻譯令基礎工作受壓，但高階、專業（法律／醫學／會議傳譯）及中英雙語人才仍具價值。',
    en: 'Translation spans business, legal, government, media and localisation; AI pressures basic work, but high-level, specialist (legal/medical/conference interpreting) and strong bilingual talent remain valuable.',
  },
  linguistics: {
    zh: '語言學出路含語言教育、語言科技（NLP）、言語治療（需進修）、出版與研究；結合程式或數據技能可切入科技與 AI 語言領域。',
    en: 'Linguistics leads to language education, language technology (NLP), speech therapy (with further study), publishing and research; coding or data skills open doors into tech and AI-language work.',
  },
  chinese: {
    zh: '中文出路以教育、出版、傳媒、公關與公職為主，中文根基紮實者於企業傳訊與內容創作亦具優勢；宜輔以第二專長擴闊就業面。',
    en: 'Chinese-language study mainly leads to education, publishing, media, PR and the civil service; strong writers also thrive in corporate communications and content. A second specialism widens options.',
  },
  english: {
    zh: '英文出路含教育、商業傳訊、公關、出版與國際企業，雙語能力在港是明顯優勢；配合專業（商、法、傳媒）或教學資格更具競爭力。',
    en: 'English study leads to education, business communication, PR, publishing and multinationals, where bilingual ability is a clear Hong Kong advantage; pairing with a profession (business, law, media) or teaching credentials boosts competitiveness.',
  },
  history: {
    zh: '歷史培養研究、分析與寫作能力，出路含教育、公職、文博、出版與傳媒；屬「可轉移技能」型學科，宜結合實習或第二專長。',
    en: 'History builds research, analysis and writing skills, leading to education, civil service, museums/heritage, publishing and media — a transferable-skills discipline best paired with internships or a second specialism.',
  },
  philosophy: {
    zh: '哲學鍛鍊思辨與論證，出路廣而不限一途：教育、公職、出版、法律（進修）、諮詢與科技倫理等；重在配合實務技能發揮分析優勢。',
    en: 'Philosophy sharpens reasoning and argument, with broad rather than fixed exits — education, civil service, publishing, law (with further study), consulting and tech ethics; pair it with practical skills to leverage its analytical edge.',
  },
  geography: {
    zh: '地理連結環境、城市規劃、地理資訊系統（GIS）與 ESG，出路含規劃、環保、測繪與政府部門；GIS 與數據技能令就業前景更佳。',
    en: 'Geography links environment, urban planning, GIS and ESG, leading to planning, conservation, mapping and government; GIS and data skills notably improve prospects.',
  },
  anthropology: {
    zh: '人類學培養跨文化與質性研究能力，出路含研究、NGO、文化與博物館、用戶研究（UX）與市場研究；配合數據或設計思維可切入商業與科技。',
    en: 'Anthropology builds cross-cultural and qualitative research skills, leading to research, NGOs, culture/museums, user (UX) research and market research; data or design-thinking skills open business and tech routes.',
  },
  chemistry: {
    zh: '化學出路含製藥、檢測認證、質量控制、環保與教育；本地研發職位有限，惟檢測、藥業與轉向數據／專利等領域仍具機會。',
    en: 'Chemistry leads to pharma, testing and certification, quality control, environmental work and education; local R&D roles are limited, but testing, pharma and pivots into data or patents offer openings.',
  },
  physics: {
    zh: '物理訓練嚴謹的量化與解難能力，出路含科研、工程、教育，以及金融量化、數據科學與科技——高度可轉移，理科尖子常轉進高薪金融／科技。',
    en: 'Physics trains rigorous quantitative and problem-solving skills, leading to research, engineering, education, and quant finance, data science and tech — highly transferable, with top students often moving into high-paying finance/tech.',
  },
  mathematics: {
    zh: '數學是最「保值」的學科之一，量化金融、精算、數據科學、AI 與教育皆搶手，薪酬優厚。純數學能力配合程式技能，轉工彈性與競爭力極高。',
    en: 'Mathematics is among the most future-proof disciplines — quant finance, actuarial, data science, AI and education all seek it, with strong pay. Combined with coding, it offers exceptional versatility and competitiveness.',
  },
  statistics: {
    zh: '統計於金融、保險、醫療、市場研究與科技需求殷切，是數據時代最實用的技能之一。香港金融與創科發展令統計人才持續供不應求，前景優。',
    en: 'Statistics is in strong demand across finance, insurance, healthcare, market research and tech — one of the most practical skills of the data age. Hong Kong’s finance and tech growth keeps statisticians in short supply, with excellent prospects.',
  },
  environmental: {
    zh: '環境科學受惠於 ESG、碳中和與綠色金融興起，出路含環保諮詢、可持續發展、政府與企業 ESG 崗位，屬成長中的新興領域。',
    en: 'Environmental science benefits from ESG, carbon-neutrality and green-finance momentum, leading to environmental consulting, sustainability, and government/corporate ESG roles — a growing, emerging field.',
  },
  food_science: {
    zh: '食品科學出路含食品安全、檢測認證、研發與品質管理，食安監管與健康飲食趨勢帶動需求，屬穩定而實用的應用科學。',
    en: 'Food science leads to food safety, testing and certification, R&D and quality management; food-safety regulation and healthy-eating trends drive demand — a stable, practical applied science.',
  },
  biology: {
    zh: '生物出路含科研、醫療相關、環保、教育及生物科技；本地純研究職位有限，惟配合生物科技投資、數據或醫療方向可拓闊發展。',
    en: 'Biology leads to research, healthcare-related roles, environment, education and biotech; pure-research jobs are limited locally, but biotech investment, data or healthcare directions widen prospects.',
  },
  music: {
    zh: '音樂出路含表演、教學、製作與藝術行政，西九文化區與 M+ 等帶動文化產業；行業競爭大、多為自由工作，宜多元技能與人脈並重。',
    en: 'Music leads to performance, teaching, production and arts administration, with the West Kowloon Cultural District and M+ boosting the sector; it is competitive and often freelance, so diverse skills and networks matter.',
  },
  design: {
    zh: '設計（平面、產品、UX/UI、數碼）需求隨數碼經濟上升，UX/UI 尤其搶手、薪酬佳。重作品集與實戰，跨界科技與商業者最具競爭力。',
    en: 'Design (graphic, product, UX/UI, digital) demand rises with the digital economy, with UX/UI especially sought after and well-paid; portfolios and hands-on work matter, and those bridging tech and business fare best.',
  },
  fine_arts: {
    zh: '視覺藝術出路含創作、策展、藝術教育、文化行政與創意產業，西九與藝術市場帶來機遇；多為自由或項目制，宜結合設計或數碼技能增加穩定收入。',
    en: 'Fine arts leads to creation, curation, arts education, cultural administration and creative industries, with West Kowloon and the art market offering opportunity; work is often freelance or project-based, so design or digital skills help stabilise income.',
  },
  sports: {
    zh: '運動科學受惠於健康與運動風氣，出路含體育教學、運動教練、體適能、運動治療與體育管理；政府推動體育發展令相關職位漸增。',
    en: 'Sports science benefits from the wellness and fitness trend, leading to PE teaching, coaching, fitness, sports therapy and sports management; government promotion of sport is expanding related roles.',
  },
  urban_planning: {
    zh: '城市規劃與北部都會區、土地供應及可持續發展密切相關，政府與顧問公司需求穩定，屬與香港長遠發展直接掛鈎的專業。',
    en: 'Urban planning ties directly to the Northern Metropolis, land supply and sustainable development, with steady demand from government and consultancies — a profession linked to Hong Kong’s long-term growth.',
  },
  education: {
    zh: '教育出路以教學為主，惟出生率下降令中小學學位收縮、教席競爭加劇；幼教、特殊教育及國際學校需求相對較好，具專科（STEM／英文）者更佔優。',
    en: 'Education leads mainly to teaching, but a falling birth rate is shrinking school places and intensifying competition for posts; kindergarten, special education and international schools fare better, and subject specialists (STEM/English) have an edge.',
  },
  engineering: {
    zh: '工程整體受惠於基建、創科與大灣區發展，需求穩定、可考專業資格；不同分支冷熱有別，屋宇設備、土木與電機電子較穩，宜按興趣選定專長。',
    en: 'Engineering broadly benefits from infrastructure, innovation and Greater Bay Area development, with stable demand and a chartered path; branches vary — building services, civil and electrical/electronic are steadier — so choose a specialism by interest.',
  },
  business: {
    zh: '商科出路最廣（會計、金融、市場、管理、營運等），實際發展視乎所選專長與實習表現。香港作為商業樞紐機會多，但入門競爭大，宜及早累積實務與專業資格。',
    en: 'Business offers the widest range (accounting, finance, marketing, management, operations), with outcomes shaped by your specialism and internships. As a business hub Hong Kong offers many openings, but entry is competitive — build experience and credentials early.',
  },
  social_science: {
    zh: '社會科學培養研究、分析與溝通等可轉移技能，出路涵蓋政策、研究、社福、傳媒與商界；宜結合數據、語文或專業資格提升就業競爭力。',
    en: 'Social science builds transferable research, analysis and communication skills, leading to policy, research, welfare, media and business; pair with data, language or professional credentials to boost employability.',
  },
  science: {
    zh: '理學出路可走科研、教育，或憑量化與解難能力轉向金融、數據與科技等高薪領域。純研究本地職位有限，跨領域（數據／金融／科技）發展空間最大。',
    en: 'Science leads to research and education, or — via quantitative and problem-solving skills — into higher-paying finance, data and tech. Pure-research roles are limited locally, so cross-disciplinary (data/finance/tech) moves offer the most room.',
  },
  humanities: {
    zh: '人文培養語文、思辨與寫作等可轉移能力，常見出路含教育、文化、傳媒、公關與公職；建議及早結合實習與第二專長，把軟技能轉化為就業優勢。',
    en: 'Humanities builds transferable language, critical-thinking and writing skills, with common paths in education, culture, media, PR and the civil service; pairing early internships with a second specialism turns soft skills into an employment edge.',
  },
};

for (const relPath of ['../backend/src/data/disciplines.json', '../frontend/src/data/disciplines.json']) {
  const p = path.resolve(relPath);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  let n = 0;
  for (const [key, v] of Object.entries(d)) {
    if (CAREER_HK[key]) { v.careerZh = CAREER_HK[key].zh; v.careerEn = CAREER_HK[key].en; n++; }
  }
  fs.writeFileSync(p, JSON.stringify(d, null, 2));
  console.log(`${relPath}: 補上 ${n} 個學科的香港就業前景`);
}
