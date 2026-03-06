const state = {
  entries: [],
  filtered: [],
  filters: {
    q: "",
    semester: "",
    branch: "",
    year: "",
    exam: "",
  },
};

const elements = {
  paperCount: document.getElementById("paper-count"),
  search: document.getElementById("search-input"),
  semester: document.getElementById("semester-filter"),
  branch: document.getElementById("branch-filter"),
  year: document.getElementById("year-filter"),
  exam: document.getElementById("exam-filter"),
  status: document.getElementById("status"),
  results: document.getElementById("results"),
  resultsTitle: document.getElementById("results-title"),
  activeFilters: document.getElementById("active-filters"),
  template: document.getElementById("result-card-template"),
};

const filterMap = {
  q: elements.search,
  semester: elements.semester,
  branch: elements.branch,
  year: elements.year,
  exam: elements.exam,
};

function readQuery() {
  const params = new URLSearchParams(window.location.search);
  state.filters.q = params.get("q") || "";
  state.filters.semester = params.get("semester") || "";
  state.filters.branch = params.get("branch") || "";
  state.filters.year = params.get("year") || "";
  state.filters.exam = params.get("exam") || "";
}

function writeQuery() {
  const params = new URLSearchParams();

  Object.entries(state.filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();
  const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  window.history.replaceState({}, "", nextUrl);
}

function uniqueValues(key) {
  return [...new Set(state.entries.map((entry) => entry[key]).filter(Boolean))];
}

function compareValues(a, b) {
  const aNum = Number(a);
  const bNum = Number(b);

  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }

  return String(a).localeCompare(String(b));
}

function populateSelect(select, values, selected) {
  const defaultOption = select.querySelector("option");
  select.innerHTML = "";
  select.append(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selected;
    select.append(option);
  });
}

function syncInputs() {
  Object.entries(filterMap).forEach(([key, element]) => {
    element.value = state.filters[key];
  });
}

function renderActiveFilters() {
  elements.activeFilters.innerHTML = "";

  const labels = {
    q: "Search",
    semester: "Semester",
    branch: "Branch",
    year: "Year",
    exam: "Exam",
  };

  Object.entries(state.filters).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    const pill = document.createElement("span");
    pill.className = "active-filter";
    pill.textContent = `${labels[key]}: ${value}`;
    elements.activeFilters.append(pill);
  });
}

function matches(entry) {
  const searchNeedle = state.filters.q.trim().toLowerCase();
  const haystack = `${entry.name} ${entry.subjectFolder || ""} ${entry.path}`.toLowerCase();

  if (searchNeedle && !haystack.includes(searchNeedle)) {
    return false;
  }

  if (state.filters.semester && entry.semester !== state.filters.semester) {
    return false;
  }

  if (state.filters.branch && entry.branch !== state.filters.branch) {
    return false;
  }

  if (state.filters.year && entry.year !== state.filters.year) {
    return false;
  }

  if (state.filters.exam && entry.examType !== state.filters.exam) {
    return false;
  }

  return true;
}

function entryHeading(entry) {
  return [entry.semester, entry.branch].filter(Boolean).join(" / ") || "Archive Entry";
}

function showStatus(message, hidden = false) {
  elements.status.textContent = message;
  elements.status.classList.toggle("hidden", hidden);
}

function renderResults() {
  state.filtered = state.entries.filter(matches);
  elements.results.innerHTML = "";
  elements.resultsTitle.textContent = `${state.filtered.length} paper${state.filtered.length === 1 ? "" : "s"} in view`;

  renderActiveFilters();

  if (!state.filtered.length) {
    showStatus("No papers matched the current search and filter combination.");
    return;
  }

  showStatus("", true);

  state.filtered.forEach((entry, index) => {
    const fragment = elements.template.content.cloneNode(true);
    const card = fragment.querySelector(".paper-card");
    const kicker = fragment.querySelector(".card-kicker");
    const year = fragment.querySelector(".card-year");
    const title = fragment.querySelector(".card-title");
    const subject = fragment.querySelector(".card-subject");
    const meta = fragment.querySelector(".card-meta");
    const link = fragment.querySelector(".card-link");

    card.style.animationDelay = `${Math.min(index * 24, 260)}ms`;
    kicker.textContent = entryHeading(entry);
    year.textContent = entry.year || "Year unknown";
    title.textContent = entry.name.replace(/\.pdf$/i, "");
    subject.textContent = entry.subjectFolder || "Direct paper entry in the mirrored archive.";
    link.href = entry.githubUrl;

    [entry.examType, entry.path].filter(Boolean).forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "meta-pill";
      pill.textContent = value;
      meta.append(pill);
    });

    elements.results.append(fragment);
  });
}

function updateFromUi() {
  state.filters.q = elements.search.value.trim();
  state.filters.semester = elements.semester.value;
  state.filters.branch = elements.branch.value;
  state.filters.year = elements.year.value;
  state.filters.exam = elements.exam.value;

  writeQuery();
  renderResults();
}

function attachEvents() {
  Object.values(filterMap).forEach((element) => {
    const eventName = element === elements.search ? "input" : "change";
    element.addEventListener(eventName, updateFromUi);
  });
}

async function loadCatalog() {
  readQuery();

  try {
    const response = await fetch("./catalog.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    state.entries = await response.json();
    elements.paperCount.textContent = `${state.entries.length} PDFs`;

    populateSelect(
      elements.semester,
      uniqueValues("semester").sort(compareValues),
      state.filters.semester,
    );
    populateSelect(
      elements.branch,
      uniqueValues("branch").sort(compareValues),
      state.filters.branch,
    );
    populateSelect(
      elements.year,
      uniqueValues("year").sort((a, b) => compareValues(b, a)),
      state.filters.year,
    );
    populateSelect(
      elements.exam,
      uniqueValues("examType").sort(compareValues),
      state.filters.exam,
    );

    syncInputs();
    attachEvents();
    renderResults();
  } catch (error) {
    elements.paperCount.textContent = "Unavailable";
    elements.resultsTitle.textContent = "Catalog unavailable";
    showStatus(`Could not load the catalog: ${error.message}`);
  }
}

loadCatalog();
