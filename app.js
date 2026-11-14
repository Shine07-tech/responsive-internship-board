
/* ==========================================
   INTERNHUB - INTERNSHIP BOARD
   API Integrated JavaScript
   ========================================== */

// 1. API Configuration

const API_BASE_URL = "http://localhost:5000/api";


// 2. DOM Elements

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


// 3. Application Data

let internships = [];
let selectedInternship = null;


// 4. Escape HTML

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


// 5. Load Internships from Backend API

async function loadInternships() {

    loadingState.hidden = false;
    errorState.hidden = true;
    emptyState.hidden = true;

    internshipList.innerHTML = "";
    resultCount.textContent = "Loading internships...";

    try {

        const response = await fetch(
            `${API_BASE_URL}/internships`
        );

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "Unable to load internships."
            );
        }

        if (!Array.isArray(result.data)) {
            throw new Error("Invalid internship data received.");
        }

        internships = result.data;

        // Ensure skills are always an array
        internships = internships.map(internship => ({
            ...internship,
            skills: Array.isArray(internship.skills)
                ? internship.skills
                : []
        }));

        loadingState.hidden = true;

        renderInternships();

    } catch (error) {

        console.error("API Loading Error:", error);

        loadingState.hidden = true;
        errorState.hidden = false;
        emptyState.hidden = true;

        resultCount.textContent =
            "Unable to load internships.";

    }
}


// 6. Generate Internship Card

function createInternshipCard(internship) {

    const skills = internship.skills.map(skill => `
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

    internshipList.innerHTML = "";

    loadingState.hidden = true;
    errorState.hidden = true;

    if (filteredInternships.length === 0) {

        emptyState.hidden = false;

        resultCount.textContent = "0 opportunities found";

        return;
    }

    emptyState.hidden = true;

    internshipList.innerHTML = filteredInternships
        .map(createInternshipCard)
        .join("");

    resultCount.textContent =
        `${filteredInternships.length} opportunities found`;
}


// 9. Search Event

searchInput.addEventListener("input", renderInternships);


// 10. Domain Filter

domainFilter.addEventListener("change", renderInternships);


// 11. Work Mode Filter

modeFilter.addEventListener("change", renderInternships);


// 12. Reset Filters

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

    applicationForm.reset();

    applicationInternshipId.value = selectedInternship.id;

    applicationMessage.textContent = "";
    applicationMessage.style.color = "";

    detailsDialog.close();

    applicationDialog.showModal();

    document.getElementById("applicantName").focus();

});


// 16. Close Application Dialog

document.getElementById("closeApplication")
    .addEventListener("click", () => {

        applicationDialog.close();

    });


// 17. Validate and Submit Application to Backend

applicationForm.addEventListener("submit", async event => {

    event.preventDefault();

    applicationMessage.textContent = "";

    const name = document.getElementById("applicantName")
        .value.trim();

    const email = document.getElementById("applicantEmail")
        .value.trim().toLowerCase();

    const portfolio = document.getElementById("portfolioUrl")
        .value.trim();

    const internshipId = applicationInternshipId.value;

    // Client-side name validation

    if (!name || name.length < 2 || name.length > 100) {

        applicationMessage.textContent =
            "Please enter a name between 2 and 100 characters.";

        return;
    }

    // Client-side email validation

    const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {

        applicationMessage.textContent =
            "Please enter a valid email address.";

        return;
    }

    // Verify internship

    const validInternship = internships.some(item =>
        item.id === internshipId
    );

    if (!validInternship) {

        applicationMessage.textContent =
            "Please select a valid internship.";

        return;
    }

    // Validate portfolio URL

    if (portfolio) {

        try {

            const url = new URL(portfolio);

            if (
                url.protocol !== "https:" ||
                !url.hostname.includes(".")
            ) {
                throw new Error("Invalid URL");
            }

        } catch {

            applicationMessage.textContent =
                "Please enter a valid HTTPS portfolio URL.";

            return;
        }
    }

    // Disable button while submitting

    const originalButtonText = applyButton.textContent;

    applyButton.disabled = true;
    applyButton.textContent = "Submitting...";

    try {

        const response = await fetch(
            `${API_BASE_URL}/applications`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    internshipId,
                    name,
                    email,
                    portfolio
                })
            }
        );

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "Application submission failed."
            );
        }

        applicationMessage.style.color = "green";

        applicationMessage.textContent =
            "Application submitted successfully!";

        applicationForm.reset();

        applicationInternshipId.value = internshipId;

    } catch (error) {

        console.error("Application Error:", error);

        applicationMessage.style.color = "red";

        applicationMessage.textContent = error.message;

    } finally {

        applyButton.disabled = false;
        applyButton.textContent = originalButtonText;

    }

});


// 18. Retry Loading Internships

retryButton.addEventListener("click", loadInternships);


// 19. Start Application

loadInternships();
