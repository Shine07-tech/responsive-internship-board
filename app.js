
/* ==========================================
   INTERNHUB - INTERNSHIP BOARD
   JavaScript Functionality
   ========================================== */

// 1. DOM Elements

const internshipList = document.getElementById("internshipList");
const searchInput = document.getElementById("searchInput");
const domainFilter = document.getElementById("domainFilter");
const modeFilter = document.getElementById("modeFilter");
const resetButton = document.getElementById("resetButton");

const loadingState = document.getElementById("loadingState");
const errorState = document.getElementById("errorState");
const emptyState = document.getElementById("emptyState");

const resultCount = document.getElementById("resultCount");
const retryButton = document.getElementById("retryButton");

const detailsDialog = document.getElementById("detailsDialog");
const detailsTitle = document.getElementById("detailsTitle");
const detailsContent = document.getElementById("detailsContent");

const applicationDialog = document.getElementById("applicationDialog");
const applicationForm = document.getElementById("applicationForm");
const applicationMessage = document.getElementById("applicationMessage");

const applicationInternshipId =
    document.getElementById("applicationInternshipId");

const applyButton = document.getElementById("applyButton");


// 2. Application Data

let internships = [];
let selectedInternship = null;

const APPLICATION_STORAGE_KEY = "internhub_applications";


// 3. Escape HTML to safely display data

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[character];
    });
}


// 4. Create a predictable API-style response

function createResponse(data, page = 1, limit = 10) {
    return {
        status: "success",
        data: data,
        pagination: {
            page: page,
            limit: limit,
            total: data.length,
            totalPages: Math.ceil(data.length / limit)
        }
    };
}


// 5. Fetch internship records from JSON

async function loadInternships() {

    loadingState.hidden = false;
    errorState.hidden = true;
    emptyState.hidden = true;

    internshipList.innerHTML = "";
    resultCount.textContent = "Loading internships...";

    try {

        const response = await fetch("data/internships.json");

        if (!response.ok) {
            throw new Error("Unable to fetch internship records.");
        }

        const jsonData = await response.json();

        if (!Array.isArray(jsonData.internships)) {
            throw new Error("Invalid internship data format.");
        }

        const apiResponse = createResponse(jsonData.internships);

        if (apiResponse.status !== "success") {
            throw new Error("Internship data could not be loaded.");
        }

        internships = apiResponse.data;

        loadingState.hidden = true;

        renderInternships();

    } catch (error) {

        console.error("Loading error:", error.message);

        loadingState.hidden = true;
        errorState.hidden = false;

        resultCount.textContent = "Unable to load internships.";

    }
}


// 6. Generate an Internship Card

function createInternshipCard(internship) {

    const skills = internship.skills
        .map(skill => `
            <span class="skill-tag">
                ${escapeHTML(skill)}
            </span>
        `).join("");

    const initials = escapeHTML(
        internship.title.substring(0, 1).toUpperCase()
    );

    return `
        <article class="internship-card">

            <div class="card-top">

                <div class="company-icon" aria-hidden="true">
                    ${initials}
                </div>

                <span class="mode-badge">
                    ${escapeHTML(internship.mode)}
                </span>

            </div>

            <h3>${escapeHTML(internship.title)}</h3>

            <p class="card-domain">
                ${escapeHTML(internship.domain)}
            </p>

            <div class="card-info">

                <span>
                    📍 ${escapeHTML(internship.location)}
                </span>

                <span>
                    ID: ${escapeHTML(internship.id)}
                </span>

            </div>

            <div class="skills-list">
                ${skills}
            </div>

            <div class="card-bottom">

                <span class="openings-text">
                    ${Number(internship.openings)} openings
                </span>

                <button
                    type="button"
                    class="details-button"
                    data-id="${escapeHTML(internship.id)}"
                    aria-label="View details for ${escapeHTML(internship.title)}"
                >
                    View Details →
                </button>

            </div>

        </article>
    `;
}


// 7. Search and Filter Internships

function filterInternships() {

    const searchTerm = searchInput.value
        .trim()
        .toLowerCase();

    const selectedDomain = domainFilter.value;
    const selectedMode = modeFilter.value;

    return internships.filter(internship => {

        const searchableContent = [
            internship.title,
            internship.domain,
            internship.location,
            internship.mode,
            ...internship.skills
        ].join(" ").toLowerCase();

        const matchesSearch =
            searchableContent.includes(searchTerm);

        const matchesDomain =
            !selectedDomain ||
            internship.domain === selectedDomain;

        const matchesMode =
            !selectedMode ||
            internship.mode === selectedMode;

        return matchesSearch && matchesDomain && matchesMode;

    });
}


// 8. Display Internship Cards

function renderInternships() {

    const filteredInternships = filterInternships();

    const apiResponse = createResponse(filteredInternships);

    internshipList.innerHTML = "";

    loadingState.hidden = true;
    errorState.hidden = true;

    if (apiResponse.data.length === 0) {

        emptyState.hidden = false;

        resultCount.textContent = "0 opportunities found";

        return;
    }

    emptyState.hidden = true;

    internshipList.innerHTML = apiResponse.data
        .map(createInternshipCard)
        .join("");

    resultCount.textContent =
        `${apiResponse.pagination.total} opportunities found`;
}


// 9. Search Event

searchInput.addEventListener("input", renderInternships);


// 10. Domain Filter Event

domainFilter.addEventListener("change", renderInternships);


// 11. Work Mode Filter Event

modeFilter.addEventListener("change", renderInternships);


// 12. Reset All Filters

resetButton.addEventListener("click", () => {

    searchInput.value = "";
    domainFilter.value = "";
    modeFilter.value = "";

    renderInternships();

});


// 13. Open Internship Details

internshipList.addEventListener("click", event => {

    const button = event.target.closest(".details-button");

    if (!button) return;

    const internship = internships.find(item =>
        item.id === button.dataset.id
    );

    if (!internship) return;

    selectedInternship = internship;

    detailsTitle.textContent = internship.title;

    detailsContent.innerHTML = `
        <p><strong>Internship ID:</strong>
            ${escapeHTML(internship.id)}</p>

        <p><strong>Domain:</strong>
            ${escapeHTML(internship.domain)}</p>

        <p><strong>Work Mode:</strong>
            ${escapeHTML(internship.mode)}</p>

        <p><strong>Location:</strong>
            ${escapeHTML(internship.location)}</p>

        <p><strong>Available Openings:</strong>
            ${Number(internship.openings)}</p>

        <p><strong>Required Skills:</strong></p>

        <div class="skills-list">
            ${internship.skills.map(skill => `
                <span class="skill-tag">
                    ${escapeHTML(skill)}
                </span>
            `).join("")}
        </div>
    `;

    detailsDialog.showModal();

});


// 14. Close Details Dialog

document.getElementById("closeDetails")
    .addEventListener("click", () => {

        detailsDialog.close();

    });


// 15. Open Application Form

applyButton.addEventListener("click", () => {

    if (!selectedInternship) return;

    applicationInternshipId.value = selectedInternship.id;

    applicationForm.reset();

    applicationInternshipId.value = selectedInternship.id;

    applicationMessage.textContent = "";

    detailsDialog.close();

    applicationDialog.showModal();

    document.getElementById("applicantName").focus();

});


// 16. Close Application Dialog

document.getElementById("closeApplication")
    .addEventListener("click", () => {

        applicationDialog.close();

    });


// 17. Validate and Submit Application

applicationForm.addEventListener("submit", event => {

    event.preventDefault();

    applicationMessage.textContent = "";

    const name = document.getElementById("applicantName")
        .value.trim();

    const email = document.getElementById("applicantEmail")
        .value.trim().toLowerCase();

    const portfolio = document.getElementById("portfolioUrl")
        .value.trim();

    const internshipId = applicationInternshipId.value;

    // Check required name

    if (!name || name.length > 100) {

        applicationMessage.textContent =
            "Please enter a valid name.";

        return;
    }

    // Check email

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        applicationMessage.textContent =
            "Please enter a valid email address.";

        return;
    }

    // Check internship ID

    const validInternship = internships.some(item =>
        item.id === internshipId
    );

    if (!validInternship) {

        applicationMessage.textContent =
            "Please select a valid internship.";

        return;
    }

    // Check portfolio URL safety

    if (portfolio) {

        try {

            const url = new URL(portfolio);

            if (!["http:", "https:"].includes(url.protocol)) {
                throw new Error("Unsafe URL");
            }

        } catch {

            applicationMessage.textContent =
                "Please enter a valid HTTP or HTTPS portfolio URL.";

            return;
        }
    }

    // Check previously submitted applications

    let previousApplications = [];

    try {

        previousApplications = JSON.parse(
            localStorage.getItem(APPLICATION_STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(previousApplications)) {
            throw new Error("Invalid application storage.");
        }

    } catch {

        applicationMessage.textContent =
            "Application storage is unavailable. Please try again.";

        return;
    }

    const duplicate = previousApplications.some(application =>
        application.internshipId === internshipId &&
        application.email === email
    );

    if (duplicate) {

        applicationMessage.textContent =
            "You have already applied for this internship.";

        return;
    }

    // Save only a duplicate-prevention key.
    // This demo does not store full applicant records.

    previousApplications.push({
        internshipId: internshipId,
        email: email
    });

    try {

        localStorage.setItem(
            APPLICATION_STORAGE_KEY,
            JSON.stringify(previousApplications)
        );

    } catch {

        applicationMessage.textContent =
            "Unable to save your application in this browser.";

        return;
    }

    applicationMessage.textContent =
        "Application submitted successfully! (Demo only)";

    applicationForm.reset();

    applicationInternshipId.value = internshipId;

});


// 18. Retry Loading Data

retryButton.addEventListener("click", loadInternships);


// 19. Start the Application

loadInternships();
