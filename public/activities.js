async function loadActivities() {
  const grid = document.querySelector("#activities-grid");
  if (!grid) return;

  const { data, error } = await supabaseClient
    .from("activities")
    .select("*")
    .eq("published", true)
    .order("start_date", { ascending: true });

  if (error) {
    console.error("Could not load activities:", error);
    grid.innerHTML = '<p class="data-message">We could not load activities right now.</p>';
    return;
  }

  renderActivities(data || []);
}

function activityCard(item) {
  const status = activityStatus(item);
  const language = item.language
    ? `<span class="language-badge">${escapeHtml(item.language)}</span>`
    : "";
  const location = item.location || item.address || "";
  const time = item.start_time ? ` · ${escapeHtml(item.start_time)}` : "";
  const registration = item.registration_required && item.registration_link
    ? `<a class="text-link" href="${escapeHtml(item.registration_link)}" target="_blank" rel="noopener">Register →</a>`
    : "";
  const extraLink = item.additional_link
    ? `<a class="text-link" href="${escapeHtml(item.additional_link)}" target="_blank" rel="noopener">More information →</a>`
    : "";
  const detailLink = item.id ? `<a class="text-link" href="activity.html?id=${encodeURIComponent(item.id)}">Read more →</a>` : "";
  const links = [detailLink, registration, extraLink].filter(Boolean).join(" ");

  const visual = item.featured_image_url
    ? `<img src="${escapeHtml(item.featured_image_url)}" alt="" loading="lazy">`
    : `<div class="default-conference-graphic"><span>ACTIVITIES<br>SLU Madrid</span></div>`;

  return `<article class="exhibition-card conference-card">
    <div class="exhibition-image">${visual}</div>
    <div class="exhibition-card-body">
      <div class="card-label-row"><span class="card-label">ACTIVITY</span>${language}</div>
      <h2>${escapeHtml(item.title || "Activity")}</h2>
      <p class="card-meta">${escapeHtml(formatDateRange(item.start_date, item.end_date))}${time}</p>
      ${location ? `<p class="card-meta">${escapeHtml(location)}</p>` : ""}
      ${item.meeting_point ? `<p class="card-meta">Meeting point: ${escapeHtml(item.meeting_point)}</p>` : ""}
      <p class="status ${status.toLowerCase()}">${escapeHtml(status)}</p>
      ${item.short_description ? `<p class="card-description">${escapeHtml(item.short_description)}</p>` : ""}
      ${links ? `<div class="conference-links">${links}</div>` : ""}
    </div>
  </article>`;
}

function activityStatus(item) {
  if (item.status_override) return item.status_override;
  const today = new Date();
  const start = item.start_date ? new Date(item.start_date + "T00:00:00") : null;
  const end = item.end_date ? new Date(item.end_date + "T23:59:59") : start;
  if (start && today < start) return "Upcoming";
  if (end && today > end) return "Past";
  return "Current";
}

function renderActivities(items) {
  const grid = document.querySelector("#activities-grid");
  if (!grid) return;
  const visible = items.filter(item => {
    const status = activityStatus(item);
    return status === "Upcoming" || status === "Current";
  });
  grid.innerHTML = visible.length
    ? visible.map(activityCard).join("")
    : '<p class="data-message">No upcoming activities right now.</p>';
}

loadActivities();
