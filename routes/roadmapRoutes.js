// Purpose: Defines API routes for the roadmapRoutes feature area.
import express from "express";
import Roadmap from "../models/Roadmap.js";

const router = express.Router();

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_COUNT = 36;
const MAX_ALLOWED_COUNT = 60;
const GROQ_BATCH_SIZE = 8;

const SEEDED_ROADMAPS = [
  { area: "Software Engineering", role: "Backend Developer", level: "Entry", summary: "Build scalable APIs and backend systems with strong database fundamentals.", skills: ["Node.js", "REST APIs", "SQL", "Authentication", "Data Structures"], tools: ["Express", "Postman", "MySQL", "MongoDB", "Git"], roadmap: [{ stage: "Foundation", focus: "Programming + CS basics", topics: ["JavaScript fundamentals", "OOP basics", "Data structures"], projects: ["CLI task manager"], outcomes: ["Write clean modular code"] }, { stage: "Backend Core", focus: "APIs and persistence", topics: ["Express routing", "JWT auth", "SQL joins", "MongoDB CRUD"], projects: ["Student portal API"], outcomes: ["Build secure CRUD APIs"] }, { stage: "Production Skills", focus: "Testing and deployment", topics: ["Unit testing", "Error handling", "Rate limiting", "Deployment basics"], projects: ["Deploy API with docs"], outcomes: ["Ship production-ready backend"] }] },
  { area: "Software Engineering", role: "Frontend Developer", level: "Entry", summary: "Create responsive and maintainable web interfaces with modern JS frameworks.", skills: ["HTML", "CSS", "JavaScript", "React", "State management"], tools: ["React", "Tailwind CSS", "Vite", "Chrome DevTools", "Git"], roadmap: [{ stage: "Foundation", focus: "Web basics", topics: ["Semantic HTML", "CSS layouts", "JS fundamentals"], projects: ["Portfolio landing page"], outcomes: ["Build responsive UI"] }, { stage: "Framework", focus: "React architecture", topics: ["Components", "Props/state", "Routing", "Forms"], projects: ["Job board frontend"], outcomes: ["Ship multi-page SPA"] }, { stage: "Professional", focus: "Performance + testing", topics: ["Code splitting", "Accessibility", "Testing library", "API integration"], projects: ["Dashboard with charts"], outcomes: ["Deliver accessible production UI"] }] },
  { area: "Software Engineering", role: "Full Stack Developer", level: "Entry", summary: "Own end-to-end feature delivery from UI to APIs and deployment.", skills: ["JavaScript", "React", "Node.js", "Databases", "System design basics"], tools: ["React", "Node", "Express", "MongoDB", "Docker"], roadmap: [{ stage: "Frontend + Backend", focus: "Core stack", topics: ["React app setup", "Express API", "Auth flow"], projects: ["Notes app full-stack"], outcomes: ["Connect client and server"] }, { stage: "Data + Security", focus: "Reliable apps", topics: ["Schema design", "Validation", "Security basics"], projects: ["E-commerce backend"], outcomes: ["Implement secure workflows"] }, { stage: "Deploy + Scale", focus: "Release engineering", topics: ["Container basics", "Env management", "Monitoring"], projects: ["Deploy full-stack app"], outcomes: ["Run full-stack app in production"] }] },
  { area: "Data & AI", role: "Data Analyst", level: "Entry", summary: "Turn raw data into business insights using SQL, visualization, and statistics.", skills: ["SQL", "Excel", "Statistics", "Data cleaning", "Storytelling"], tools: ["Power BI", "Tableau", "Pandas", "MySQL", "Jupyter"], roadmap: [{ stage: "Data Basics", focus: "Cleaning and querying", topics: ["SQL select/group by", "Missing data handling", "Descriptive stats"], projects: ["Sales analysis report"], outcomes: ["Extract insights from raw datasets"] }, { stage: "Visualization", focus: "Dashboards", topics: ["Chart selection", "KPI design", "Dashboard storytelling"], projects: ["Placement analytics dashboard"], outcomes: ["Present actionable dashboards"] }, { stage: "Business Impact", focus: "Decision support", topics: ["A/B testing basics", "Cohort analysis", "Forecasting intro"], projects: ["Retention analysis"], outcomes: ["Drive data-informed decisions"] }] },
  { area: "Data & AI", role: "Machine Learning Engineer", level: "Entry", summary: "Build and deploy ML models with robust evaluation and feature engineering.", skills: ["Python", "ML algorithms", "Feature engineering", "Model evaluation", "Deployment"], tools: ["scikit-learn", "Pandas", "NumPy", "FastAPI", "MLflow"], roadmap: [{ stage: "ML Foundation", focus: "Modeling basics", topics: ["Regression", "Classification", "Train/test split", "Metrics"], projects: ["Churn prediction"], outcomes: ["Train baseline ML models"] }, { stage: "Applied ML", focus: "Feature and tuning", topics: ["Feature scaling", "Cross-validation", "Hyperparameter tuning"], projects: ["Recommendation prototype"], outcomes: ["Improve model performance"] }, { stage: "MLOps Intro", focus: "Serving models", topics: ["Model serialization", "API serving", "Monitoring drift"], projects: ["Deploy prediction API"], outcomes: ["Deploy and track ML models"] }] },
  { area: "Data & AI", role: "Data Engineer", level: "Entry", summary: "Design pipelines and reliable data platforms for analytics and ML teams.", skills: ["SQL", "Python", "ETL", "Data modeling", "Batch processing"], tools: ["Airflow", "Spark", "BigQuery", "dbt", "Kafka"], roadmap: [{ stage: "Pipeline Basics", focus: "Ingestion + transform", topics: ["ETL concepts", "Data quality checks", "Scheduling basics"], projects: ["CSV to warehouse pipeline"], outcomes: ["Build repeatable ETL jobs"] }, { stage: "Warehouse + Modeling", focus: "Analytics data layer", topics: ["Star schema", "Partitioning", "Incremental models"], projects: ["Analytics mart setup"], outcomes: ["Design analytics-ready data models"] }, { stage: "Streaming + Scale", focus: "Realtime + performance", topics: ["Kafka basics", "Spark jobs", "Cost optimization"], projects: ["Realtime event pipeline"], outcomes: ["Handle batch and streaming workloads"] }] },
  { area: "Cloud & DevOps", role: "DevOps Engineer", level: "Entry", summary: "Automate build, test, deploy, and infrastructure management workflows.", skills: ["Linux", "CI/CD", "Containers", "Cloud basics", "Scripting"], tools: ["Docker", "GitHub Actions", "Jenkins", "AWS", "Terraform"], roadmap: [{ stage: "Ops Basics", focus: "Environment and automation", topics: ["Linux commands", "Bash scripting", "Networking basics"], projects: ["Server setup scripts"], outcomes: ["Automate routine ops tasks"] }, { stage: "CI/CD + Containers", focus: "Delivery pipeline", topics: ["Docker images", "Pipeline stages", "Artifact management"], projects: ["CI/CD for web app"], outcomes: ["Automate build and deploy"] }, { stage: "Infra as Code", focus: "Cloud provisioning", topics: ["Terraform modules", "IAM basics", "Logging/monitoring"], projects: ["Provision staging infra"], outcomes: ["Manage cloud infra as code"] }] },
  { area: "Cloud & DevOps", role: "Cloud Engineer", level: "Entry", summary: "Build and operate cloud-native systems with reliability and cost awareness.", skills: ["Cloud services", "Networking", "Security", "Monitoring", "Automation"], tools: ["AWS", "Azure", "CloudWatch", "Terraform", "Kubernetes"], roadmap: [{ stage: "Cloud Core", focus: "Compute + storage", topics: ["VMs", "Object storage", "VPC basics"], projects: ["Static site + CDN"], outcomes: ["Deploy secure cloud resources"] }, { stage: "Platform Services", focus: "Scalable systems", topics: ["Managed databases", "Load balancing", "Autoscaling"], projects: ["Scalable web backend"], outcomes: ["Operate resilient cloud services"] }, { stage: "Governance", focus: "Cost and security", topics: ["Cost explorer", "Least privilege IAM", "Backup strategy"], projects: ["Cloud architecture review"], outcomes: ["Design secure cost-efficient cloud stack"] }] },
  { area: "Cloud & DevOps", role: "Site Reliability Engineer", level: "Entry", summary: "Improve reliability with observability, incident response, and performance tuning.", skills: ["Reliability engineering", "Monitoring", "Incident management", "Automation", "Performance"], tools: ["Prometheus", "Grafana", "PagerDuty", "Kubernetes", "Terraform"], roadmap: [{ stage: "SRE Fundamentals", focus: "Reliability concepts", topics: ["SLI/SLO/SLA", "Alerting principles", "Runbooks"], projects: ["Service reliability dashboard"], outcomes: ["Define measurable reliability goals"] }, { stage: "Observability", focus: "Metrics/logs/traces", topics: ["Instrumentation", "Alert tuning", "Incident triage"], projects: ["Distributed tracing setup"], outcomes: ["Detect and resolve incidents faster"] }, { stage: "Resilience", focus: "Chaos + capacity", topics: ["Load testing", "Failure injection", "Capacity planning"], projects: ["Resilience test plan"], outcomes: ["Improve system uptime under stress"] }] },
  { area: "Cybersecurity", role: "SOC Analyst", level: "Entry", summary: "Monitor threats, triage alerts, and improve incident response readiness.", skills: ["Network security", "Threat detection", "Log analysis", "SIEM", "Incident response"], tools: ["Splunk", "Wireshark", "ELK", "MITRE ATT&CK", "VirusTotal"], roadmap: [{ stage: "Security Foundation", focus: "Threat landscape", topics: ["CIA triad", "Attack vectors", "Network protocols"], projects: ["Threat intel notes"], outcomes: ["Understand common cyber threats"] }, { stage: "Detection", focus: "Monitoring and triage", topics: ["SIEM queries", "IOC analysis", "Alert workflows"], projects: ["SOC alert playbook"], outcomes: ["Handle alerts systematically"] }, { stage: "Response", focus: "Containment and reporting", topics: ["Incident lifecycle", "Forensics basics", "Post-incident review"], projects: ["Incident simulation report"], outcomes: ["Respond confidently to incidents"] }] },
  { area: "Cybersecurity", role: "Penetration Tester", level: "Entry", summary: "Assess application and network security through ethical hacking methodologies.", skills: ["Web security", "OWASP Top 10", "Vulnerability assessment", "Scripting", "Reporting"], tools: ["Burp Suite", "Nmap", "Metasploit", "Kali Linux", "OWASP ZAP"], roadmap: [{ stage: "Recon + Basics", focus: "Attack surface understanding", topics: ["Footprinting", "Port scanning", "HTTP basics"], projects: ["Recon report for test target"], outcomes: ["Map systems and services"] }, { stage: "Exploit Practice", focus: "Web vulnerabilities", topics: ["SQLi", "XSS", "Auth flaws", "Broken access control"], projects: ["DVWA pentest report"], outcomes: ["Identify exploitable weaknesses"] }, { stage: "Professional Reporting", focus: "Remediation guidance", topics: ["Risk scoring", "Proof of concept", "Fix validation"], projects: ["Client-style pentest report"], outcomes: ["Produce remediation-focused reports"] }] },
  { area: "Mobile Development", role: "Android Developer", level: "Entry", summary: "Build performant Android apps with modern architecture and testing.", skills: ["Kotlin", "Android SDK", "Architecture components", "REST integration", "UI/UX"], tools: ["Android Studio", "Kotlin", "Room", "Retrofit", "Firebase"], roadmap: [{ stage: "Android Basics", focus: "App lifecycle", topics: ["Activities/fragments", "Layouts", "Navigation"], projects: ["Habit tracker app"], outcomes: ["Develop functional Android screens"] }, { stage: "Data + Networking", focus: "State and APIs", topics: ["Room DB", "Retrofit", "MVVM"], projects: ["News app with offline support"], outcomes: ["Integrate local and remote data"] }, { stage: "Quality + Release", focus: "Polish and publish", topics: ["UI tests", "Crash analytics", "Play Store prep"], projects: ["Production-ready app release"], outcomes: ["Ship a stable Android application"] }] },
  { area: "Mobile Development", role: "iOS Developer", level: "Entry", summary: "Develop polished iOS apps with Swift and modern app architecture.", skills: ["Swift", "iOS SDK", "Networking", "State management", "App architecture"], tools: ["Xcode", "SwiftUI", "UIKit", "Core Data", "TestFlight"], roadmap: [{ stage: "Swift + UI", focus: "Core app building", topics: ["Swift basics", "SwiftUI views", "Navigation"], projects: ["Task planner app"], outcomes: ["Build interactive iOS screens"] }, { stage: "Data + Integrations", focus: "Persistence and APIs", topics: ["API calls", "Core Data", "Error handling"], projects: ["Weather app"], outcomes: ["Deliver data-driven mobile apps"] }, { stage: "Testing + Publish", focus: "Release readiness", topics: ["Unit tests", "Performance checks", "App Store checklist"], projects: ["App release candidate"], outcomes: ["Prepare apps for production release"] }] },
  { area: "QA & Testing", role: "QA Automation Engineer", level: "Entry", summary: "Design robust automated test suites for web and API products.", skills: ["Testing fundamentals", "Automation scripting", "API testing", "Bug tracking", "CI integration"], tools: ["Selenium", "Playwright", "Postman", "Jest", "Jenkins"], roadmap: [{ stage: "Testing Core", focus: "Quality fundamentals", topics: ["Test case design", "Bug lifecycle", "Regression strategy"], projects: ["Manual test plan"], outcomes: ["Create complete test coverage"] }, { stage: "Automation", focus: "Scripted test suites", topics: ["UI automation", "API automation", "Assertions"], projects: ["Automated smoke tests"], outcomes: ["Reduce manual testing effort"] }, { stage: "CI Quality Gates", focus: "Pipeline integration", topics: ["Pipeline test stages", "Reporting", "Flaky test handling"], projects: ["CI-integrated test suite"], outcomes: ["Enforce quality in deployment pipeline"] }] },
  { area: "Product & Business", role: "Product Analyst", level: "Entry", summary: "Bridge product decisions with data analysis and user behavior insights.", skills: ["Product metrics", "SQL", "Experimentation", "User research", "Communication"], tools: ["Amplitude", "Mixpanel", "SQL", "Excel", "Tableau"], roadmap: [{ stage: "Product Thinking", focus: "Metrics and funnels", topics: ["North star metrics", "Funnel analysis", "Retention cohorts"], projects: ["Feature usage dashboard"], outcomes: ["Measure product performance"] }, { stage: "Decision Support", focus: "Experiments", topics: ["A/B testing", "Hypothesis design", "Result interpretation"], projects: ["Experiment analysis report"], outcomes: ["Recommend evidence-based decisions"] }, { stage: "Cross-team Impact", focus: "Stakeholder communication", topics: ["Narrative reporting", "Tradeoff analysis", "Roadmap input"], projects: ["Quarterly product insights deck"], outcomes: ["Influence product roadmap with data"] }] },
  { area: "Product & Business", role: "Associate Product Manager", level: "Entry", summary: "Own feature delivery by aligning user needs, engineering scope, and metrics.", skills: ["Problem framing", "Prioritization", "User stories", "Stakeholder management", "Analytics"], tools: ["Jira", "Notion", "Figma", "Mixpanel", "Google Analytics"], roadmap: [{ stage: "PM Basics", focus: "Product fundamentals", topics: ["PRD writing", "User personas", "Roadmapping"], projects: ["Feature PRD"], outcomes: ["Translate problems into requirements"] }, { stage: "Execution", focus: "Shipping features", topics: ["Sprint planning", "Acceptance criteria", "Release notes"], projects: ["End-to-end feature launch"], outcomes: ["Coordinate cross-functional execution"] }, { stage: "Outcome Focus", focus: "Measure and iterate", topics: ["KPI tracking", "Feedback loops", "Prioritization frameworks"], projects: ["Post-launch analysis"], outcomes: ["Improve features based on outcomes"] }] },
  { area: "System Design", role: "System Design Engineer", level: "Entry", summary: "Develop practical system design skills for interviews and scalable product thinking.", skills: ["Scalability", "APIs", "Databases", "Caching", "Distributed systems"], tools: ["Draw.io", "Redis", "Nginx", "Kafka", "Docker"], roadmap: [{ stage: "Core Concepts", focus: "Building blocks", topics: ["Load balancing", "Caching", "DB indexing", "CAP theorem"], projects: ["Design URL shortener"], outcomes: ["Explain architecture tradeoffs"] }, { stage: "Applied Design", focus: "Common interview systems", topics: ["Rate limiter", "Feed system", "Messaging design"], projects: ["Design chat application"], outcomes: ["Solve medium design prompts"] }, { stage: "Interview Readiness", focus: "Communication and depth", topics: ["Requirement clarification", "Bottleneck analysis", "Capacity estimates"], projects: ["Mock design interviews"], outcomes: ["Present structured design answers"] }] },
  { area: "Emerging Tech", role: "Generative AI Engineer", level: "Entry", summary: "Build LLM-powered applications with prompt design, retrieval, and evaluation.", skills: ["Python", "Prompt engineering", "RAG", "Vector databases", "Evaluation"], tools: ["LangChain", "OpenAI API", "FAISS", "FastAPI", "Streamlit"], roadmap: [{ stage: "LLM Basics", focus: "Prompting and APIs", topics: ["Prompt patterns", "Token limits", "Model settings"], projects: ["Prompt playground app"], outcomes: ["Use LLM APIs effectively"] }, { stage: "RAG Systems", focus: "Knowledge-grounded generation", topics: ["Embeddings", "Chunking", "Retrieval pipelines"], projects: ["Document Q&A bot"], outcomes: ["Build grounded AI assistants"] }, { stage: "Production Guardrails", focus: "Reliability and safety", topics: ["Evaluation metrics", "Prompt injection defenses", "Latency/cost tuning"], projects: ["Production LLM assistant"], outcomes: ["Deploy trustworthy GenAI features"] }] },
  { area: "Emerging Tech", role: "Blockchain Developer", level: "Entry", summary: "Create decentralized applications and smart contracts with secure patterns.", skills: ["Solidity", "Smart contracts", "Web3 fundamentals", "Testing", "Security basics"], tools: ["Hardhat", "Remix", "Ethers.js", "MetaMask", "Ganache"], roadmap: [{ stage: "Blockchain Basics", focus: "Core principles", topics: ["Consensus basics", "Wallets", "Transactions"], projects: ["Simple token contract"], outcomes: ["Understand chain operations"] }, { stage: "dApp Development", focus: "Contracts + frontend", topics: ["Solidity patterns", "Events", "Web3 integration"], projects: ["Voting dApp"], outcomes: ["Build end-to-end dApps"] }, { stage: "Security + Audit", focus: "Safe contract design", topics: ["Reentrancy", "Access control", "Gas optimization"], projects: ["Contract security checklist"], outcomes: ["Write safer smart contracts"] }] },
  { area: "Networking", role: "Network Engineer", level: "Entry", summary: "Design, configure, and troubleshoot enterprise network infrastructure.", skills: ["Routing", "Switching", "Subnetting", "Network security", "Troubleshooting"], tools: ["Cisco Packet Tracer", "Wireshark", "GNS3", "Nagios", "SolarWinds"], roadmap: [{ stage: "Network Fundamentals", focus: "Core networking", topics: ["OSI model", "IPv4 subnetting", "VLAN basics"], projects: ["Campus network simulation"], outcomes: ["Design basic network layouts"] }, { stage: "Operations", focus: "Setup and diagnostics", topics: ["Routing protocols", "NAT", "Firewall rules"], projects: ["Branch office network setup"], outcomes: ["Configure reliable network paths"] }, { stage: "Security + Monitoring", focus: "Resilience", topics: ["IDS/IPS basics", "Traffic monitoring", "Incident response"], projects: ["Network monitoring dashboard"], outcomes: ["Improve network reliability and security"] }] },
  { area: "Enterprise Platforms", role: "SAP Consultant", level: "Entry", summary: "Implement and optimize SAP modules aligned to business processes.", skills: ["Business process mapping", "ERP fundamentals", "Configuration", "Documentation", "Client communication"], tools: ["SAP S/4HANA", "SAP Fiori", "Excel", "Jira", "Power BI"], roadmap: [{ stage: "ERP Foundation", focus: "SAP concepts", topics: ["SAP modules overview", "Master data", "Business workflows"], projects: ["Mini process mapping"], outcomes: ["Understand module interactions"] }, { stage: "Module Specialization", focus: "Core implementation", topics: ["Configuration basics", "Testing scenarios", "Data migration intro"], projects: ["Functional configuration exercise"], outcomes: ["Execute module-level setup"] }, { stage: "Delivery Skills", focus: "Consulting workflow", topics: ["Requirement workshops", "UAT support", "Documentation"], projects: ["Implementation playbook"], outcomes: ["Contribute effectively to SAP projects"] }] },
  { area: "UI/UX Design", role: "UI/UX Designer", level: "Entry", summary: "Design intuitive digital experiences backed by user research and interaction design.", skills: ["User research", "Wireframing", "Visual design", "Interaction design", "Usability testing"], tools: ["Figma", "Adobe XD", "Miro", "Maze", "Notion"], roadmap: [{ stage: "Design Basics", focus: "Core design principles", topics: ["Typography", "Color systems", "Layout and hierarchy"], projects: ["Landing page redesign"], outcomes: ["Create visually coherent interfaces"] }, { stage: "UX Process", focus: "Research to prototype", topics: ["User interviews", "Personas", "Wireframes", "Prototyping"], projects: ["Mobile app prototype"], outcomes: ["Translate user needs into flows"] }, { stage: "Validation", focus: "Testing and iteration", topics: ["Usability testing", "Accessibility basics", "Design handoff"], projects: ["Usability test report"], outcomes: ["Ship validated user-centered designs"] }] }
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function roadmapKey(item) {
  return `${normalizeText(item?.area)}::${normalizeText(item?.role)}`;
}

function roleKey(item) {
  return normalizeText(item?.role)
    .replace(/\b(junior|jr|entry level|entry-level|fresher|associate)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeRoadmaps(items, count) {
  const seen = new Set();
  const seenRoles = new Set();
  const unique = [];

  for (const item of items || []) {
    const key = roadmapKey(item);
    const rKey = roleKey(item);
    if (!key || !rKey || seen.has(key) || seenRoles.has(rKey)) continue;
    seen.add(key);
    seenRoles.add(rKey);
    unique.push(item);
    if (unique.length >= count) break;
  }

  return unique;
}

function sanitizeStage(stage) {
  return {
    stage: typeof stage?.stage === "string" ? stage.stage.trim() : "",
    focus: typeof stage?.focus === "string" ? stage.focus.trim() : "",
    topics: Array.isArray(stage?.topics)
      ? stage.topics.map((t) => String(t || "").trim()).filter(Boolean)
      : [],
    projects: Array.isArray(stage?.projects)
      ? stage.projects.map((p) => String(p || "").trim()).filter(Boolean)
      : [],
    outcomes: Array.isArray(stage?.outcomes)
      ? stage.outcomes.map((o) => String(o || "").trim()).filter(Boolean)
      : [],
  };
}

function sanitizeRoadmaps(items, count) {
  if (!Array.isArray(items)) return [];

  const cleaned = items
    .map((item) => {
      const roadmap = Array.isArray(item?.roadmap) ? item.roadmap.map(sanitizeStage).filter((s) => s.stage) : [];
      return {
        area: typeof item?.area === "string" ? item.area.trim() : "",
        role: typeof item?.role === "string" ? item.role.trim() : "",
        level: typeof item?.level === "string" ? item.level.trim() : "Entry",
        summary: typeof item?.summary === "string" ? item.summary.trim() : "",
        skills: Array.isArray(item?.skills)
          ? item.skills.map((s) => String(s || "").trim()).filter(Boolean)
          : [],
        tools: Array.isArray(item?.tools)
          ? item.tools.map((t) => String(t || "").trim()).filter(Boolean)
          : [],
        roadmap,
      };
    })
    .filter((item) => item.area && item.role && item.summary && item.roadmap.length);

  return dedupeRoadmaps(cleaned, count);
}

function buildPrompt({ area, role, count }) {
  const targetHint = [
    area ? `Focus area: ${area}.` : "Include varied modern CS areas (software, data/AI, cloud/devops, cybersecurity, mobile, product).",
    role ? `Prioritize this role: ${role}.` : "Include a diverse role mix.",
  ].join(" ");

  return [
    {
      role: "system",
      content:
        "You are a career roadmap planner for placement students. " +
        `Return exactly ${count} roadmap objects as valid JSON object with shape {\"items\":[...]}. ` +
        "No markdown. No extra text. " +
        "Each item fields: area, role, level, summary, skills, tools, roadmap. " +
        "Cover diverse hiring domains and avoid repetitive software-only roles. " +
        "Use realistic current entry-level job titles commonly seen in campus hiring. " +
        "roadmap is an array of 2 to 4 stages. " +
        "Each stage fields: stage, focus, topics, projects, outcomes. " +
        "topics/projects/outcomes must be arrays of short strings.",
    },
    {
      role: "user",
      content:
        `${targetHint} Create practical entry-level roadmaps for campus placements. ` +
        "Keep summaries concise and realistic. Include varied areas and roles such as backend, frontend, full stack, data analyst, ML engineer, data engineer, cloud engineer, DevOps, cybersecurity analyst, QA automation, mobile, product analyst, UI/UX, networking, SAP consultant, and generative AI roles. Avoid duplicates.",
    },
  ];
}

async function fetchGroqRoadmaps(messages) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is missing");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.25,
      max_tokens: 3600,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq error: ${res.status} ${text}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from Groq");

  const normalized = String(content)
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    const arrayMatch = normalized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    throw new Error("Failed to parse Groq roadmap JSON");
  }

  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.items)) return parsed.items;
  if (Array.isArray(parsed.roadmaps)) return parsed.roadmaps;
  throw new Error("Unexpected Groq roadmap JSON shape");
}

async function saveRoadmaps(items) {
  if (!items.length) return;

  const ops = items.map((item) => ({
    updateOne: {
      filter: { area: item.area, role: item.role },
      update: {
        $set: {
          level: item.level || "Entry",
          summary: item.summary,
          skills: item.skills || [],
          tools: item.tools || [],
          roadmap: item.roadmap || [],
        },
      },
      upsert: true,
    },
  }));

  await Roadmap.bulkWrite(ops, { ordered: false });
}

function resolveCount(req) {
  const requested = Number.parseInt(req.query?.count, 10);
  if (!Number.isFinite(requested)) return DEFAULT_COUNT;
  if (requested < 1) return 1;
  return Math.min(requested, MAX_ALLOWED_COUNT);
}

async function findRoadmaps(area, role, count) {
  const query = {};
  if (area) query.area = new RegExp(`^${escapeRegex(area)}$`, "i");
  if (role) query.role = new RegExp(escapeRegex(role), "i");

  const items = await Roadmap.find(query)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(count * 5)
    .lean();

  return dedupeRoadmaps(items, count);
}

function filterSeededRoadmaps(area, role, count) {
  const filtered = SEEDED_ROADMAPS.filter((item) => {
    return matchesFilters(item, area, role);
  });
  return dedupeRoadmaps(filtered, count);
}

function matchesFilters(item, area, role) {
  const areaMatch = !area || normalizeText(item?.area) === normalizeText(area);
  const roleMatch = !role || normalizeText(item?.role).includes(normalizeText(role));
  return areaMatch && roleMatch;
}

router.get("/", async (req, res) => {
  const area = String(req.query?.area || "").trim();
  const role = String(req.query?.role || "").trim();
  const count = resolveCount(req);

  try {
    const seeded = filterSeededRoadmaps(area, role, count);
    const cached = await findRoadmaps(area, role, count);
    const base = dedupeRoadmaps([...seeded, ...cached], count);
    if (base.length >= Math.min(count, 12)) {
      return res.json(base);
    }

    const needed = Math.max(1, count - base.length);
    const generated = [];
    const maxBatches = Math.ceil(needed / GROQ_BATCH_SIZE) + 1;

    for (let i = 0; i < maxBatches && generated.length < needed; i += 1) {
      const batchSize = Math.min(GROQ_BATCH_SIZE, needed - generated.length);
      const raw = await fetchGroqRoadmaps(buildPrompt({ area, role, count: batchSize }));
      const clean = sanitizeRoadmaps(raw, batchSize);
      generated.push(...clean);
    }

    const cleanGenerated = sanitizeRoadmaps(generated, needed).filter((item) => matchesFilters(item, area, role));
    await saveRoadmaps(cleanGenerated);

    const latest = await findRoadmaps(area, role, count);
    const merged = dedupeRoadmaps([...seeded, ...latest, ...cleanGenerated].filter((item) => matchesFilters(item, area, role)), count);
    if (!merged.length) {
      return res.status(503).json({ message: "Could not generate career roadmaps right now" });
    }

    return res.json(merged);
  } catch (err) {
    try {
      const cached = await findRoadmaps(area, role, count);
      const seeded = filterSeededRoadmaps(area, role, count);
      const merged = dedupeRoadmaps([...seeded, ...cached], count);
      if (merged.length) return res.json(merged);
    } catch {}

    return res.status(500).json({ message: err.message || "Failed to load roadmaps" });
  }
});

export default router;
