async function loadExhibitions() {
  const grid = document.querySelector("#exhibitions-grid");
  if (!grid) return;
  const { data, error } = await supabaseClient.from("exhibitions").select("*").eq("published", true).order("start_date", { ascending: true });
  if (error) { console.error("Could not load exhibitions:", error); grid.innerHTML = '<p class="data-message">We could not load exhibitions right now.</p>'; return; }
  renderExhibitions(data || []);
}

async function loadConferences() {
  const upcomingGrid = document.querySelector("#conferences-grid");
  if (!upcomingGrid) return;

  const { data, error } = await supabaseClient
    .from("conferences")
    .select("*")
    .eq("published", true)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Could not load conferences:", error);
    upcomingGrid.innerHTML = '<p class="data-message">We could not load conferences right now.</p>';
    return;
  }

  renderConferences(data || []);
}

function eventStatus(item) {
  if (item.status_override) return item.status_override;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseStoredDate(item.start_date);
  const end = parseStoredDate(item.end_date) || start;
  if (start && today < start) return "Upcoming";
  if (end) end.setHours(23, 59, 59, 999);
  if (end && today > end) return "Past";
  return "Current";
}

function parseStoredDate(value) {
  if (!value) return null;
  // Supabase timestamp fields may already include a time and timezone.
  // Use the calendar-date portion without appending a second time string.
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateRange(start, end) {
  if (!start) return "";
  const o = {day:"numeric", month:"short", year:"numeric"};
  const startDate = parseStoredDate(start);
  const endDate = end ? parseStoredDate(end) : null;
  if (!startDate) return "Date to be announced";
  const s = startDate.toLocaleDateString("en-US", o);
  return endDate ? s + " – " + endDate.toLocaleDateString("en-US", o) : s;
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}

function conferenceVisual(item) {
  if (item.featured_image_url) return `<img src="${escapeHtml(item.featured_image_url)}" alt="" loading="lazy">`;
  return `<div class="default-conference-graphic"><span>CONFERENCE<br>Art History</span></div>`;
}

function conferenceCard(item) {
  const status = eventStatus(item);
  const language = item.language ? `<span class="language-badge">${escapeHtml(item.language)}</span>` : "";
  const location = item.location || item.address || "";
  const organizer = item.organizer ? `<p class="card-meta">${escapeHtml(item.organizer)}</p>` : "";
  const registration = item.registration_link
    ? `<a class="text-link" href="${escapeHtml(item.registration_link)}" target="_blank" rel="noopener">Registration →</a>`
    : "";
  const official = item.official_website
    ? `<a class="text-link" href="${escapeHtml(item.official_website)}" target="_blank" rel="noopener">Official website →</a>`
    : "";
  const links = [registration, official].filter(Boolean).join(" ");
  const detailLink = item.id ? `<a class="text-link" href="conference.html?id=${encodeURIComponent(item.id)}">Read more →</a>` : "";

  return `<article class="exhibition-card conference-card">
    <div class="exhibition-image">${conferenceVisual(item)}</div>
    <div class="exhibition-card-body">
      <div class="card-label-row"><span class="card-label">CONFERENCE</span>${language}</div>
      <h2>${escapeHtml(item.title)}</h2>
      <p class="card-meta">${escapeHtml(formatDateRange(item.start_date, item.end_date))}</p>
      ${location ? `<p class="card-meta">${escapeHtml(location)}</p>` : ""}
      ${organizer}
      <p class="status ${status.toLowerCase()}">${escapeHtml(status)}</p>
      ${item.short_description ? `<p class="card-description">${escapeHtml(item.short_description)}</p>` : ""}
      ${detailLink}
      ${links ? `<div class="conference-links">${links}</div>` : ""}
    </div>
  </article>`;
}

function renderConferences(items) {
  const upcomingGrid = document.querySelector("#conferences-grid");
  const pastSection = document.querySelector("#past-conferences-section");
  const pastGrid = document.querySelector("#past-conferences-grid");

  const upcoming = items.filter(i => {
    const status = eventStatus(i);
    return status === "Upcoming" || status === "Current";
  });
  const past = items.filter(i => eventStatus(i) === "Past");

  upcomingGrid.innerHTML = upcoming.length
    ? upcoming.map(conferenceCard).join("")
    : '<p class="data-message">No upcoming conferences right now.</p>';

  if (past.length && pastSection && pastGrid) {
    pastSection.hidden = false;
    pastGrid.innerHTML = past.map(conferenceCard).join("");
  }
}

function exhibitionStatus(item) {
  if (item.status_override) return item.status_override;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = parseStoredDate(item.start_date);
  const end = parseStoredDate(item.end_date);
  if (start && today < start) return "Upcoming";
  if (end) end.setHours(23, 59, 59, 999);
  if (end && today > end) return "Past";
  return "Current";
}

function renderExhibitions(items) {
  const grid = document.querySelector("#exhibitions-grid");
  const filtered = items.filter(i => {
    const status = exhibitionStatus(i);
    return status === "Current" || status === "Upcoming";
  });
  if (!filtered.length) { grid.innerHTML = '<p class="data-message">No current or upcoming exhibitions right now.</p>'; return; }
  grid.innerHTML = filtered.map(item => {
      const status = exhibitionStatus(item);
      const visual = item.featured_image_url ? `<img src="${escapeHtml(item.featured_image_url)}" alt="" loading="lazy">` : `<div class="default-exhibition-graphic"><span>Madrid<br>Art History</span></div>`;
      const language = item.language ? `<span class="language-badge">${escapeHtml(item.language)}</span>` : "";
      return `<article class="exhibition-card"><div class="exhibition-image">${visual}</div><div class="exhibition-card-body"><div class="card-label-row"><span class="card-label">EXHIBITION</span>${language}</div><h2>${escapeHtml(item.title)}</h2><p class="card-meta">${escapeHtml(formatDateRange(item.start_date, item.end_date))}</p>${item.venue ? `<p class="card-meta">${escapeHtml(item.venue)}</p>` : ""}<p class="status ${status.toLowerCase()}">${status}</p>${item.short_description ? `<p class="card-description">${escapeHtml(item.short_description)}</p>` : ""}<a class="text-link" href="exhibition.html?id=${encodeURIComponent(item.id)}">Read more →</a></div></article>`;
  }).join("");
}

loadExhibitions();
loadConferences();


async function loadCourses() {
  const container = document.querySelector("#courses-content");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("courses")
    .select("*")
    .eq("published", true);

  if (error) {
    console.error("Could not load courses:", error);
    container.innerHTML = '<p class="data-message">We could not load courses right now. Please try again later.</p>';
    return;
  }

  renderCourses(data || []);
}



function renderCourses(items) {
  const container = document.querySelector("#courses-content");
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="courses-empty">
        <h2>Courses coming soon</h2>
        <p>Course listings will appear here as they are published.</p>
      </div>`;
    return;
  }

  const levels = ["Introductory", "Intermediate", "Advanced"];
  const sorted = [...items].sort((a, b) => {
    const order = level =>
      levels.findIndex(item => item.toLowerCase() === String(level || "").toLowerCase());

    const aOrder = order(a.level);
    const bOrder = order(b.level);

    return (aOrder < 0 ? 99 : aOrder) - (bOrder < 0 ? 99 : bOrder)
      || String(a.code || a.title || "").localeCompare(String(b.code || b.title || ""));
  });

  const renderCourse = (course, index) => {
    const code = escapeHtml(course.code || "ART HISTORY");
    const title = escapeHtml(course.title || "Untitled course");
    const description = course.full_description || course.short_description
      || "Course description to be added.";

    const meta = [
      course.when_offered,
      course.credits != null ? `${course.credits} credits` : "",
      course.language
    ].filter(Boolean).map(escapeHtml).join(" · ");

    const image = course.featured_image_url
      ? `<img class="course-expanded-image"
          src="${escapeHtml(course.featured_image_url)}"
          alt="" loading="lazy">`
      : "";

    const instructor = course.instructor
      ? `<p><strong>Instructor:</strong> ${escapeHtml(course.instructor)}</p>` : "";

    const prerequisites = course.prerequisites
      ? `<p><strong>Prerequisites:</strong> ${escapeHtml(course.prerequisites)}</p>` : "";

    const link = course.course_link
      ? `<a class="text-link course-detail-link"
          href="${escapeHtml(course.course_link)}"
          target="_blank" rel="noopener">Course details ↗</a>` : "";

    return `
      <article class="course-row" id="course-${index}">
        <button class="course-row-toggle" type="button"
          aria-expanded="false" aria-controls="course-details-${index}">
          <span class="course-row-code">${code}</span>
          <span class="course-row-title">${title}</span>
          <span class="course-row-meta">${meta}</span>
          <span class="course-row-icon" aria-hidden="true">+</span>
        </button>
        <div class="course-expanded" id="course-details-${index}">
          <div class="course-expanded-inner">
            ${image}
            <div class="course-expanded-copy">
              <p class="course-expanded-description">${escapeHtml(description).replace(/\n/g, "<br>")}</p>
              ${instructor}
              ${prerequisites}
              ${link}
            </div>
          </div>
        </div>
      </article>`;
  };

  const sections = levels.map((level, levelIndex) => {
    const courses = sorted.filter(
      course => String(course.level || "").toLowerCase() === level.toLowerCase()
    );

    if (!courses.length) return "";

    const sectionId = `courses-${level.toLowerCase()}`;

    return `
      <section class="course-level-section" id="${sectionId}">
        <div class="course-level-heading">
          <span class="course-level-number">0${levelIndex + 1}</span>
          <h2>${level}</h2>
          <span class="course-count">${courses.length} ${courses.length === 1 ? "course" : "courses"}</span>
        </div>
        <div class="course-list">
          ${courses.map((course, i) =>
            renderCourse(course, `${levelIndex}-${i}`)
          ).join("")}
        </div>
      </section>`;
  }).join("");

  const otherCourses = sorted.filter(course =>
    !levels.some(level => String(course.level || "").toLowerCase() === level.toLowerCase())
  );

  const otherSection = otherCourses.length ? `
    <section class="course-level-section" id="courses-other">
      <div class="course-level-heading">
        <span class="course-level-number">04</span>
        <h2>Other courses</h2>
        <span class="course-count">${otherCourses.length} courses</span>
      </div>
      <div class="course-list">
        ${otherCourses.map((course, i) => renderCourse(course, `other-${i}`)).join("")}
      </div>
    </section>` : "";

  container.innerHTML = `
    <nav class="course-level-nav" aria-label="Jump to course level">
      <span class="course-nav-label">EXPLORE BY LEVEL</span>
      ${levels.map(level => `
        <a href="#courses-${level.toLowerCase()}">${level}</a>
      `).join("")}
      ${otherCourses.length ? '<a href="#courses-other">Other</a>' : ""}
    </nav>
    ${sections}
    ${otherSection}`;

  container.querySelectorAll(".course-row-toggle").forEach(button => {
    button.addEventListener("click", () => {
      const row = button.closest(".course-row");
      const expanded = row.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded", String(expanded));
    });
  });
}



loadCourses();


async function loadNews() {
  const grid = document.querySelector("#news-grid, #home-news");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("news")
    .select("*")
    .eq("published", true)
    .order("publication_date", { ascending: false });

  if (error) {
    console.error("Could not load community news:", error);
    grid.innerHTML = '<p class="data-message">We could not load community news right now.</p>';
    return;
  }

  renderNews(data || []);
}

function renderNews(items) {
  const grid = document.querySelector("#news-grid, #home-news");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML = '<p class="data-message">No community news has been published yet.</p>';
    return;
  }

  grid.innerHTML = items.map(item => {
    const image = item.featured_image_url
      ? `<img src="${escapeHtml(item.featured_image_url)}" alt="" loading="lazy">`
      : `<div class="default-exhibition-graphic"><span>COMMUNITY<br>Art History</span></div>`;
    const language = item.language
      ? `<span class="language-badge">${escapeHtml(item.language)}</span>`
      : "";
    const date = item.publication_date
      ? `<p class="card-meta">${escapeHtml(parseStoredDate(item.publication_date)?.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) || "")}</p>`
      : "";
    const excerpt = item.excerpt
      ? `<p class="card-description">${escapeHtml(item.excerpt)}</p>`
      : "";
    const link = item.additional_link
      ? `<a class="text-link" href="${escapeHtml(item.additional_link)}" target="_blank" rel="noopener">Read more →</a>`
      : "";
    const articleLink = item.article_content && item.id
      ? `<a class="text-link" href="article.html?id=${encodeURIComponent(item.id)}">Read article →</a>`
      : "";

    return `<article class="exhibition-card news-card">
      <div class="exhibition-image">${image}</div>
      <div class="exhibition-card-body">
        <div class="card-label-row"><span class="card-label">${escapeHtml(item.category || "COMMUNITY")}</span>${language}</div>
        <h2>${escapeHtml(item.title || "")}</h2>
        ${date}
        ${item.author ? `<p class="card-meta">${escapeHtml(item.author)}</p>` : ""}
        ${excerpt}
        ${articleLink}
        ${link}
      </div>
    </article>`;
  }).join("");
}

loadNews();


async function loadEventDetail(table, targetId, typeLabel) {
  const target = document.querySelector(targetId);
  if (!target) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    target.innerHTML = '<p class="data-message">No event was selected.</p>';
    return;
  }
  const { data, error } = await supabaseClient.from(table).select("*").eq("id", id).eq("published", true).maybeSingle();
  if (error || !data) {
    console.error(`Could not load ${typeLabel.toLowerCase()}:`, error);
    target.innerHTML = `<p class="data-message">We could not load this ${typeLabel.toLowerCase()} right now.</p>`;
    return;
  }
  const esc = escapeHtml;
  const date = formatDateRange(data.start_date, data.end_date);
  const imageUrl = data.featured_image_url || "";
  const image = imageUrl ? `<img class="event-detail-hero" src="${esc(imageUrl)}" alt="">` : "";
  const venue = data.venue || data.location || data.address || "";
  const organizer = data.organizer ? `<p class="card-meta">Organizer: ${esc(data.organizer)}</p>` : "";
  const language = data.language ? `<p class="card-meta">Language: ${esc(data.language)}</p>` : "";
  const fullDescription = data.full_description ? `<div class="event-detail-description">${esc(data.full_description).replace(/\n/g, "<br>")}</div>` : (data.short_description ? `<div class="event-detail-description">${esc(data.short_description).replace(/\n/g, "<br>")}</div>` : "");
  const program = data.program ? `<section class="event-detail-section"><h2>Programme</h2><div>${esc(data.program).replace(/\n/g, "<br>")}</div></section>` : "";
  const speakers = data.speakers ? `<section class="event-detail-section"><h2>Speakers</h2><div>${esc(data.speakers).replace(/\n/g, "<br>")}</div></section>` : "";
  const registrationInfo = data.registration_info ? `<section class="event-detail-section"><h2>Registration</h2><div>${esc(data.registration_info).replace(/\n/g, "<br>")}</div></section>` : "";
  const links = [
    data.registration_link ? `<a class="button" href="${esc(data.registration_link)}" target="_blank" rel="noopener">Registration</a>` : "",
    data.official_website ? `<a class="text-link" href="${esc(data.official_website)}" target="_blank" rel="noopener">Official website →</a>` : "",
    data.additional_link ? `<a class="text-link" href="${esc(data.additional_link)}" target="_blank" rel="noopener">Additional information →</a>` : ""
  ].filter(Boolean).join(" ");
  target.innerHTML = `
    <a class="text-link" href="${table === "exhibitions" ? "exhibitions.html" : "conferences.html"}">← Back to ${typeLabel === "Exhibition" ? "Exhibitions" : "Conferences"}</a>
    <article class="event-detail">
      <p class="eyebrow">${typeLabel}</p>
      <h1>${esc(data.title || "")}</h1>
      ${image}
      ${date ? `<p class="card-meta">${esc(date)}</p>` : ""}
      ${venue ? `<p class="card-meta">${esc(venue)}</p>` : ""}
      ${organizer}${language}
      ${fullDescription}
      ${program}${speakers}${registrationInfo}
      ${links ? `<div class="event-detail-links">${links}</div>` : ""}
    </article>`;
}
loadEventDetail("exhibitions", "#exhibition-detail", "Exhibition");
loadEventDetail("conferences", "#conference-detail", "Conference");


async function loadFaculty() {
  const grid = document.querySelector("#faculty-grid");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("faculty")
    .select("*")
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Could not load faculty:", error);
    grid.innerHTML =
      '<p class="data-message">We could not load faculty profiles right now.</p>';
    return;
  }

  renderFaculty(data || []);
}

function renderFaculty(items) {
  const grid = document.querySelector("#faculty-grid");
  if (!grid) return;

  if (!items.length) {
    grid.innerHTML =
      '<p class="data-message">Faculty profiles will appear here soon.</p>';
    return;
  }

  grid.innerHTML = items.map(person => {
    const name = escapeHtml(person.name || "");
    const position = person.position
      ? `<p class="faculty-position">${escapeHtml(person.position)}</p>`
      : "";
    const description = person.short_description
      ? `<p class="faculty-description">${escapeHtml(person.short_description).replace(/\n/g, "<br>")}</p>`
      : "";
      const photo = person.featured_image_url
      ? `<img src="${escapeHtml(person.featured_image_url)}" alt="Portrait of ${name}" loading="lazy">`
      : `<div class="faculty-photo-placeholder" aria-hidden="true">Art History</div>`;
    const profileLink = person.id
      ? `<a class="faculty-profile-link" href="faculty-profile.html?id=${encodeURIComponent(person.id)}">Read more →</a>`
      : "";
    const officialLink = person.official_slu_profile_url
      ? `<p><a class="text-link" href="${escapeHtml(person.official_slu_profile_url)}" target="_blank" rel="noopener">Official SLU profile ↗</a></p>`
      : "";

    return `
      <article class="faculty-card">
        <div class="faculty-photo">${photo}</div>
        <div class="faculty-card-body">
          <h2>${name}</h2>
          ${position}
          ${description}
          ${profileLink}
          ${officialLink}
        </div>
      </article>`;
  }).join("");
}


async function loadFacultyProfile() {
  const container = document.querySelector('#faculty-profile-content');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    container.innerHTML = '<p class="data-message">No faculty profile was selected. Please return to the faculty directory.</p>';
    container.setAttribute('aria-busy', 'false');
    return;
  }

  const { data: person, error } = await supabaseClient
    .from('faculty')
    .select('*')
    .eq('id', id)
    .eq('published', true)
    .single();

  if (error || !person) {
    console.error('Could not load faculty profile:', error);
    container.innerHTML = '<p class="data-message">This faculty profile could not be loaded. Please return to the faculty directory.</p>';
    container.setAttribute('aria-busy', 'false');
    return;
  }

  const name = escapeHtml(person.name || 'Faculty profile');
  const photo = person.featured_image_url
    ? `<img class="faculty-detail-photo" src="${escapeHtml(person.featured_image_url)}" alt="Portrait of ${name}">`
    : '<div class="faculty-detail-photo faculty-photo-placeholder" aria-hidden="true">Art History</div>';
  const position = person.position ? `<p class="faculty-position">${escapeHtml(person.position)}</p>` : '';
  const shortBio = person.short_description ? `<p class="faculty-detail-lead">${escapeHtml(person.short_description).replace(/\n/g, '<br>')}</p>` : '';
  const longDescription = person.long_description
    ? `<section class="faculty-detail-section"><h2>Profile &amp; research</h2><div class="faculty-long-description">${escapeHtml(person.long_description).replace(/\n/g, '<br>')}</div></section>`
    : '';
  const publications = person.recent_publications
    ? `<section class="faculty-detail-section"><h2>Recent publications</h2><ul class="faculty-publications">${person.recent_publications.split(/\r?\n/).map(item => item.trim()).filter(Boolean).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></section>`
    : '';
  const official = person.official_slu_profile_url
    ? `<p><a class="text-link" href="${escapeHtml(person.official_slu_profile_url)}" target="_blank" rel="noopener">Official SLU profile ↗</a></p>`
    : '';

  container.innerHTML = `
    <a class="faculty-back-link" href="faculty.html">← Back to faculty</a>
    <article class="faculty-detail">
      <div class="faculty-detail-image">${photo}</div>
      <div class="faculty-detail-main">
        <p class="eyebrow">Art History · Saint Louis Madrid</p>
        <h1>${name}</h1>
        ${position}
        ${shortBio}
        ${longDescription}
        ${publications}
        ${official}
      </div>
    </article>`;
  container.setAttribute('aria-busy', 'false');
}

loadFacultyProfile();

loadFaculty();