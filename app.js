
"use strict";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

const API_BASE_URL = "https://responsive-internship-board-8n0j.onrender.com/api";
const PAGE_LIMIT = 5;

// --------------------------------------------------
// DOM ELEMENTS
// --------------------------------------------------

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
const closeDetails = document.getElementById("closeDetails");
const applyButton = document.getElementById("applyButton");

const applicationDialog = document.getElementById("applicationDialog");
const applicationForm = document.getElementById("applicationForm");
const applicationMessage = document.getElementById("applicationMessage");
const applicationInternshipId = document.getElementById(
    "applicationInternshipId"
);

const closeApplication = document.getElementById("closeApplication");
const applicantName = document.getElementById("applicantName");
const applicantEmail = document.getElementById("applicantEmail");
const portfolioUrl = document.getElementById("portfolioUrl");

// --------------------------------------------------
// APPLICATION STATE
// --------------------------------------------------

let currentPage = 1;
let totalPages = 1;
let selectedInternship = null;
let searchTimer = null;
let requestController = null;
let requestNumber = 0;

// --------------------------------------------------
// CREATE PAGINATION CONTAINER
// --------------------------------------------------

const paginationContainer = document.createElement("nav");

paginationContainer.id = "paginationContainer";
paginationContainer.className = "pagination-container";
paginationContainer.setAttribute("aria-label", "Internship pages");

internshipList.insertAdjacentElement("afterend", paginationContainer);

// --------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------

function hideAllStates() {
    loadingState.hidden = true;
    errorState.hidden = true;
    emptyState.hidden = true;
}

function showLoading() {
    hideAllStates();

    loadingState.hidden = false;
    internshipList.replaceChildren();
    paginationContainer.replaceChildren();

    resultCount.textContent = "Loading internships...";
}

function showError(message) {
    hideAllStates();

    errorState.hidden = false;
    internshipList.replaceChildren();
    paginationContainer.replaceChildren();

    const errorParagraph = errorState.querySelector("p");

    if (errorParagraph) {
        errorParagraph.textContent = message;
    }

    resultCount.textContent = "Unable to load opportunities.";
}

function showEmpty() {
    hideAllStates();

    emptyState.hidden = false;
    internshipList.replaceChildren();
    paginationContainer.replaceChildren();

    resultCount.textContent = "0 opportunities found.";
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;
}

function createButton(text, className, onClick) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className;
    button.textContent = text;
    button.addEventListener("click", onClick);

    return button;
}

function formatSkills(skills) {
    if (!Array.isArray(skills)) {
        return [];
    }

    return skills.filter(
        (skill) => typeof skill === "string"
    );
}

// --------------------------------------------------
// FETCH INTERNSHIPS
// --------------------------------------------------

async function fetchInternships() {
    // Cancel an older request if the user changes filters quickly.
    if (requestController) {
        requestController.abort();
    }

    requestController = new AbortController();

    const thisRequest = ++requestNumber;

    showLoading();

    const params = new URLSearchParams();

    params.set("page", currentPage);
    params.set("limit", PAGE_LIMIT);

    const search = searchInput.value.trim();
    const domain = domainFilter.value;
    const mode = modeFilter.value;

    if (search) {
        params.set("search", search);
    }

    if (domain) {
        params.set("domain", domain);
    }

    if (mode) {
        params.set("mode", mode);
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/internships?${params.toString()}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                signal: requestController.signal
            }
        );

        const result = await response.json();

        // Ignore responses from older requests.
        if (thisRequest !== requestNumber) {
            return;
        }

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "Unable to load internships."
            );
        }

        if (!Array.isArray(result.data)) {
            throw new Error("Invalid response received from the server.");
        }

        const pagination = result.pagination || {};

        totalPages = Math.max(
            1,
            Number(pagination.totalPages) || 1
        );

        currentPage = Math.max(
            1,
            Number(pagination.page) || currentPage
        );

        renderInternships(result.data);

        const total = Number(pagination.total) || 0;

        if (total === 0) {
            showEmpty();
            return;
        }

        hideAllStates();

        const start = (currentPage - 1) * PAGE_LIMIT + 1;
        const end = Math.min(currentPage * PAGE_LIMIT, total);

        resultCount.textContent =
            `Showing ${start}-${end} of ${total} opportunities`;

        renderPagination();

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        console.error("Internship fetch error:", error);

        showError(
            error.message ||
            "Unable to connect to the server. Please try again."
        );
    }
}

// --------------------------------------------------
// RENDER INTERNSHIP CARDS
// --------------------------------------------------

function renderInternships(internships) {
    internshipList.replaceChildren();

    internships.forEach((internship) => {
        const card = createElement("article", "internship-card");

        // Card heading
        const cardHeader = createElement("div", "card-header");

        const title = createElement(
            "h3",
            "internship-title",
            internship.title || "Untitled Internship"
        );

        const domain = createElement(
            "span",
            "internship-domain",
            internship.domain || "General"
        );

        cardHeader.append(title, domain);

        // Internship information
        const information = createElement(
            "div",
            "internship-information"
        );

        const location = createElement(
            "p",
            "internship-location",
            `Location: ${internship.location || "Not specified"}`
        );

        const mode = createElement(
            "p",
            "internship-mode",
            `Work Mode: ${internship.mode || "Not specified"}`
        );

        const openings = createElement(
            "p",
            "internship-openings",
            `Openings: ${internship.openings ?? "Not specified"}`
        );

        information.append(location, mode, openings);

        // Skills
        const skillsContainer = createElement(
            "div",
            "internship-skills"
        );

        formatSkills(internship.skills).forEach((skill) => {
            const skillTag = createElement(
                "span",
                "skill-tag",
                skill
            );

            skillsContainer.appendChild(skillTag);
        });

        // Buttons
        const actions = createElement("div", "card-actions");

        const detailsButton = createButton(
            "View Details",
            "details-button",
            () => openDetails(internship)
        );

        const cardApplyButton = createButton(
            "Apply Now",
            "apply-card-button",
            () => openApplication(internship)
        );

        actions.append(detailsButton, cardApplyButton);

        card.append(
            cardHeader,
            information,
            skillsContainer,
            actions
        );

        internshipList.appendChild(card);
    });
}

// --------------------------------------------------
// PAGINATION
// --------------------------------------------------

function renderPagination() {
    paginationContainer.replaceChildren();

    if (totalPages <= 1) {
        return;
    }

    const previousButton = createButton(
        "← Previous",
        "pagination-button",
        () => changePage(currentPage - 1)
    );

    previousButton.disabled = currentPage <= 1;

    paginationContainer.appendChild(previousButton);

    const pageInformation = createElement(
        "span",
        "pagination-info",
        `Page ${currentPage} of ${totalPages}`
    );

    paginationContainer.appendChild(pageInformation);

    const nextButton = createButton(
        "Next →",
        "pagination-button",
        () => changePage(currentPage + 1)
    );

    nextButton.disabled = currentPage >= totalPages;

    paginationContainer.appendChild(nextButton);
}

function changePage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }

    currentPage = page;

    fetchInternships();

    document.getElementById("internships").scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// --------------------------------------------------
// INTERNSHIP DETAILS DIALOG
// --------------------------------------------------

function openDetails(internship) {
    selectedInternship = internship;

    detailsTitle.textContent =
        internship.title || "Internship Details";

    detailsContent.replaceChildren();

    const domain = createElement(
        "p",
        "details-domain",
        `Domain: ${internship.domain || "Not specified"}`
    );

    const location = createElement(
        "p",
        "",
        `Location: ${internship.location || "Not specified"}`
    );

    const mode = createElement(
        "p",
        "",
        `Work Mode: ${internship.mode || "Not specified"}`
    );

    const openings = createElement(
        "p",
        "",
        `Openings: ${internship.openings ?? "Not specified"}`
    );

    const skillsHeading = createElement("h3", "", "Required Skills");

    const skillsList = createElement("ul", "details-skills");

    formatSkills(internship.skills).forEach((skill) => {
        skillsList.appendChild(
            createElement("li", "", skill)
        );
    });

    detailsContent.append(
        domain,
        location,
        mode,
        openings,
        skillsHeading,
        skillsList
    );

    detailsDialog.showModal();
}

// --------------------------------------------------
// APPLICATION DIALOG
// --------------------------------------------------

function openApplication(internship) {
    if (!internship || !internship.id) {
        return;
    }

    selectedInternship = internship;

    applicationForm.reset();

    applicationInternshipId.value = internship.id;

    applicationMessage.textContent = "";
    applicationMessage.className = "";

    if (detailsDialog.open) {
        detailsDialog.close();
    }

    applicationDialog.showModal();
}

// --------------------------------------------------
// APPLICATION FORM VALIDATION
// --------------------------------------------------

function validatePortfolio(value) {
    if (!value) {
        return true;
    }

    try {
        const url = new URL(value);

        return (
            url.protocol === "https:" &&
            url.hostname.includes(".")
        );
    } catch {
        return false;
    }
}

// --------------------------------------------------
// SUBMIT APPLICATION
// --------------------------------------------------

applicationForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const internshipId = applicationInternshipId.value.trim();
    const name = applicantName.value.trim();
    const email = applicantEmail.value.trim();
    const portfolio = portfolioUrl.value.trim();

    applicationMessage.textContent = "";
    applicationMessage.className = "";

    if (!internshipId) {
        applicationMessage.textContent =
            "Please select an internship before applying.";
        return;
    }

    if (name.length < 2 || name.length > 80) {
        applicationMessage.textContent =
            "Please enter a valid name between 2 and 80 characters.";
        applicantName.focus();
        return;
    }

    if (!/^[\p{L}\p{M} .'-]+$/u.test(name)) {
        applicationMessage.textContent =
            "Your name contains invalid characters.";
        applicantName.focus();
        return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        applicationMessage.textContent =
            "Please enter a valid email address.";
        applicantEmail.focus();
        return;
    }

    if (portfolio && !validatePortfolio(portfolio)) {
        applicationMessage.textContent =
            "Please enter a valid HTTPS portfolio URL.";
        portfolioUrl.focus();
        return;
    }

    const submitButton = applicationForm.querySelector(
        'button[type="submit"]'
    );

    const originalButtonText = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    const applicationData = {
        internshipId,
        name,
        email,
        portfolio
    };

    try {
        const response = await fetch(
            `${API_BASE_URL}/applications`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(applicationData)
            }
        );

        const result = await response.json();

        if (!response.ok || result.status !== "success") {
            throw new Error(
                result.message || "Unable to submit your application."
            );
        }

        applicationMessage.textContent =
            "Your application has been submitted successfully!";

        applicationMessage.className = "success-message";

        applicationForm.reset();

        applicationInternshipId.value = internshipId;

        // Close the dialog after the success message is visible.
        setTimeout(() => {
            if (applicationDialog.open) {
                applicationDialog.close();
            }
        }, 1800);

    } catch (error) {
        console.error("Application submission error:", error);

        applicationMessage.textContent =
            error.message ||
            "Something went wrong. Please try again.";

        applicationMessage.className = "error-message";

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
    }
});

// --------------------------------------------------
// SEARCH AND FILTER EVENTS
// --------------------------------------------------

searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
        currentPage = 1;
        fetchInternships();
    }, 350);
});

domainFilter.addEventListener("change", () => {
    currentPage = 1;
    fetchInternships();
});

modeFilter.addEventListener("change", () => {
    currentPage = 1;
    fetchInternships();
});

// --------------------------------------------------
// RESET FILTERS
// --------------------------------------------------

resetButton.addEventListener("click", () => {
    searchInput.value = "";
    domainFilter.value = "";
    modeFilter.value = "";

    clearTimeout(searchTimer);

    currentPage = 1;

    fetchInternships();
});

// --------------------------------------------------
// RETRY BUTTON
// --------------------------------------------------

retryButton.addEventListener("click", () => {
    fetchInternships();
});

// --------------------------------------------------
// DIALOG CLOSE BUTTONS
// --------------------------------------------------

closeDetails.addEventListener("click", () => {
    detailsDialog.close();
});

closeApplication.addEventListener("click", () => {
    applicationDialog.close();
});

// Close dialogs when clicking their backdrop.
detailsDialog.addEventListener("click", (event) => {
    if (event.target === detailsDialog) {
        detailsDialog.close();
    }
});

applicationDialog.addEventListener("click", (event) => {
    if (event.target === applicationDialog) {
        applicationDialog.close();
    }
});

// Apply button inside the details dialog.
applyButton.addEventListener("click", () => {
    if (selectedInternship) {
        openApplication(selectedInternship);
    }
});

// --------------------------------------------------
// INITIALIZE APPLICATION
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    fetchInternships();
});
