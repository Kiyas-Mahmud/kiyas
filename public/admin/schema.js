/* ============================================================
   Content schema shared by the admin panel (form builder) and
   the Worker (validation). Each section is one JSON document in
   D1. Field types:
     text · textarea · url · lines (one item per line → array)
     image (upload to R2 or paste a URL) · file (PDF upload)
     checkbox · select · list (repeatable group of fields)
   ============================================================ */

const heading = (idx, title) => [
  { key: "heading", label: "Section title", type: "text", default: title },
];

const LINK_TYPES = [
  ["github", "GitHub / code"],
  ["live", "Live site"],
  ["dataset", "Dataset"],
  ["paper", "Paper / DOI"],
  ["scholar", "Google Scholar"],
  ["other", "Other link"],
];

const linkList = {
  key: "links",
  label: "Links",
  type: "list",
  itemLabel: "label",
  fields: [
    { key: "type", label: "Type", type: "select", options: LINK_TYPES },
    { key: "label", label: "Button text", type: "text" },
    { key: "url", label: "URL", type: "url" },
  ],
};

export const SECTIONS = [
  {
    key: "site",
    icon: "fa-gear",
    group: "Settings",
    anchor: "#hero",
    title: "Site settings",
    hint: "Browser title, share preview, CV file and footer.",
    fields: [
      { key: "title", label: "Page title", type: "text" },
      { key: "description", label: "Search / share description", type: "textarea", maxHint: 160, help: "Shown on Google and when the link is shared. About 150–160 characters works best." },
      { key: "ogImage", label: "Share image (1200×630)", type: "image", noCompress: true, help: "Preview image for WhatsApp, Facebook, LinkedIn. Use a 1200×630 image." },
      { key: "cvUrl", label: "CV (PDF)", type: "file", accept: "application/pdf", help: "Upload a new PDF to replace the CV on every Download CV button." },
      { key: "cvFileName", label: "CV download file name", type: "text", help: "The name the file gets when someone downloads it. Default: Kiyas-Mahmud.pdf" },
      { key: "footerRole", label: "Footer line", type: "text" },
    ],
  },
  {
    key: "hero",
    icon: "fa-house",
    group: "Page",
    anchor: "#hero",
    title: "Hero",
    hint: "The first screen: name, role, intro, portrait and headline numbers.",
    fields: [
      { key: "eyebrow", label: "Small line above name", type: "text", help: "Example: Dhaka, Bangladesh · Open to graduate research positions" },
      { key: "name", label: "Name", type: "text" },
      { key: "role", label: "Role line", type: "text" },
      { key: "lede", label: "Intro paragraph", type: "textarea" },
      { key: "portrait", label: "Portrait", type: "image", help: "A portrait (3:4) photo works best." },
      { key: "portraitAlt", label: "Portrait description (alt text)", type: "text" },
      { key: "portraitCaption", label: "Portrait caption", type: "text" },
      { key: "scholar", label: "Google Scholar URL", type: "url" },
      { key: "github", label: "GitHub URL", type: "url" },
      { key: "linkedin", label: "LinkedIn URL", type: "url" },
      { key: "email", label: "Email", type: "text" },
      {
        key: "stats",
        label: "Headline numbers",
        type: "list",
        itemLabel: "label",
        fields: [
          { key: "label", label: "Label", type: "text" },
          { key: "value", label: "Value", type: "text" },
          { key: "suffix", label: "Small suffix (e.g. /4.00)", type: "text" },
          { key: "note", label: "Note", type: "text" },
        ],
      },
    ],
  },
  {
    key: "about",
    icon: "fa-user",
    group: "Page",
    anchor: "#about",
    title: "About",
    hint: "Profile text, research interests, education and languages.",
    fields: [
      ...heading("01", "Profile & education"),
      { key: "lead", label: "Lead sentence", type: "textarea" },
      { key: "body", label: "Profile paragraph", type: "textarea" },
      { key: "interests", label: "Research interests", type: "lines", help: "One interest per line. Each line becomes a chip." },
      {
        key: "education",
        label: "Education",
        type: "list",
        itemLabel: "degree",
        fields: [
          { key: "degree", label: "Degree", type: "text" },
          { key: "year", label: "Year", type: "text" },
          { key: "school", label: "Institution", type: "text" },
          { key: "score", label: "Result", type: "text" },
        ],
      },
      { key: "languages", label: "Languages line", type: "text" },
    ],
  },
  {
    key: "research",
    icon: "fa-flask",
    group: "Page",
    anchor: "#research",
    title: "Research",
    hint: "Thesis card and research assistant roles.",
    fields: [
      ...heading("02", "Research experience"),
      { key: "thesisTag", label: "Thesis tag line", type: "text" },
      { key: "thesisTitle", label: "Thesis title", type: "textarea" },
      { key: "thesisSupervisor", label: "Supervisor line", type: "text" },
      { key: "thesisPoints", label: "Thesis bullet points", type: "lines", help: "One point per line." },
      {
        key: "metrics",
        label: "Result metrics",
        type: "list",
        itemLabel: "label",
        fields: [
          { key: "label", label: "Label", type: "text" },
          { key: "value", label: "Value", type: "text" },
          { key: "unit", label: "Unit (e.g. pp)", type: "text" },
        ],
      },
      { key: "metricsNote", label: "Note under metrics", type: "text" },
      linkList,
      {
        key: "roles",
        label: "Research roles",
        type: "list",
        itemLabel: "title",
        fields: [
          { key: "period", label: "Period", type: "text" },
          { key: "title", label: "Role · organisation", type: "text" },
          { key: "text", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "publications",
    icon: "fa-book-open",
    group: "Page",
    anchor: "#publications",
    title: "Publications",
    hint: "Papers with status and links. Order here is the order on the site.",
    fields: [
      ...heading("03", "Publications"),
      {
        key: "items",
        label: "Publications",
        type: "list",
        itemLabel: "title",
        fields: [
          { key: "title", label: "Title", type: "textarea" },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              ["accepted", "Accepted"],
              ["published", "Published"],
              ["presented", "Presented"],
              ["review", "Under review"],
            ],
          },
          { key: "venue", label: "Venue", type: "text" },
          { key: "note", label: "Summary", type: "textarea" },
          linkList,
        ],
      },
    ],
  },
  {
    key: "experience",
    icon: "fa-briefcase",
    group: "Page",
    anchor: "#experience",
    title: "Experience",
    hint: "Professional and industry work.",
    fields: [
      ...heading("04", "Professional & industry experience"),
      {
        key: "items",
        label: "Experience",
        type: "list",
        itemLabel: "title",
        fields: [
          { key: "tag", label: "Tag line", type: "text" },
          { key: "title", label: "Title", type: "text" },
          { key: "org", label: "Organisation", type: "text" },
          { key: "kind", label: "Kind of work", type: "text" },
          { key: "private", label: "Show “Client project · private”", type: "checkbox" },
          { key: "points", label: "Bullet points", type: "lines", help: "One point per line." },
          { key: "tech", label: "Technologies", type: "lines", help: "One per line. Shown as Python · FastAPI · …" },
        ],
      },
    ],
  },
  {
    key: "projects",
    icon: "fa-diagram-project",
    group: "Page",
    anchor: "#projects",
    title: "Projects",
    hint: "Every project needs a live link, a GitHub link, or the Private box ticked.",
    fields: [
      ...heading("05", "Selected projects"),
      {
        key: "items",
        label: "Projects",
        type: "list",
        itemLabel: "title",
        fields: [
          { key: "title", label: "Project name", type: "text" },
          { key: "tagline", label: "One-line description", type: "text" },
          { key: "badge", label: "Award badge (optional)", type: "text", help: "Example: WICEBD Silver Medal. Leave empty for no badge." },
          { key: "points", label: "Bullet points", type: "lines", help: "One point per line." },
          { key: "tech", label: "Technologies", type: "lines", help: "One per line. Shown as Python · FastAPI · …" },
          { key: "liveUrl", label: "Live site URL", type: "url", help: "Leave empty if there is no live site." },
          { key: "gitUrl", label: "GitHub URL", type: "url" },
          { key: "private", label: "Private project (no public link)", type: "checkbox", help: "Tick this when there is no live or GitHub link to show." },
        ],
      },
      { key: "moreUrl", label: "“More projects” link", type: "url" },
    ],
  },
  {
    key: "skills",
    icon: "fa-code",
    group: "Page",
    anchor: "#skills",
    title: "Skills",
    hint: "Grouped technical skills.",
    fields: [
      ...heading("06", "Technical skills"),
      {
        key: "items",
        label: "Skill groups",
        type: "list",
        itemLabel: "label",
        fields: [
          { key: "label", label: "Group", type: "text" },
          { key: "value", label: "Skills", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "honors",
    icon: "fa-trophy",
    group: "Page",
    anchor: "#honors",
    title: "Honors",
    hint: "Awards, courses and certificate images. New certificates appear first.",
    fields: [
      ...heading("07", "Honors, awards & certificates"),
      {
        key: "awards",
        label: "Awards",
        type: "list",
        itemLabel: "title",
        fields: [
          {
            key: "icon",
            label: "Icon",
            type: "select",
            options: [
              ["trophy", "Trophy"],
              ["medal", "Medal"],
              ["globe", "Globe"],
              ["award", "Ribbon"],
              ["star", "Star"],
            ],
          },
          { key: "title", label: "Award", type: "text" },
          { key: "note", label: "Note", type: "text" },
        ],
      },
      {
        key: "courses",
        label: "Courses",
        type: "list",
        itemLabel: "title",
        fields: [
          { key: "title", label: "Course", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
        ],
      },
      {
        key: "certificates",
        label: "Certificate images",
        type: "list",
        itemLabel: "alt",
        newestFirst: true,
        display: "grid",
        fields: [
          { key: "image", label: "Image", type: "image" },
          { key: "alt", label: "Description", type: "text" },
        ],
      },
    ],
  },
  {
    key: "leadership",
    icon: "fa-people-group",
    group: "Page",
    anchor: "#leadership",
    title: "Leadership",
    hint: "Leadership and community roles.",
    fields: [
      ...heading("08", "Leadership & community"),
      {
        key: "items",
        label: "Roles",
        type: "list",
        itemLabel: "org",
        fields: [
          { key: "role", label: "Role · year", type: "text" },
          { key: "org", label: "Organisation", type: "text" },
          { key: "text", label: "Description", type: "textarea" },
        ],
      },
    ],
  },
  {
    key: "gallery",
    icon: "fa-images",
    group: "Media",
    anchor: "#gallery",
    title: "Gallery",
    hint: "Events & recognition photos. The newest photo you add shows first.",
    fields: [
      ...heading("09", "Events & recognition"),
      {
        key: "items",
        label: "Photos",
        type: "list",
        itemLabel: "alt",
        newestFirst: true,
        display: "grid",
        fields: [
          { key: "image", label: "Image", type: "image" },
          { key: "alt", label: "Description", type: "text" },
        ],
      },
    ],
  },
  {
    key: "contact",
    icon: "fa-envelope",
    group: "Page",
    anchor: "#contact",
    title: "Contact",
    hint: "Contact details and references.",
    fields: [
      ...heading("10", "Get in touch"),
      { key: "lede", label: "Intro text", type: "textarea" },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "location", label: "Location", type: "text" },
      {
        key: "references",
        label: "References",
        type: "list",
        itemLabel: "name",
        fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "title", label: "Position", type: "text" },
        ],
      },
      { key: "refsNote", label: "Note under references", type: "text" },
    ],
  },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key);
