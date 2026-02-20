(function () {
  "use strict";

  function createJobTracker(root, options) {
    var rootEl = typeof root === "string" ? document.querySelector(root) : root;
    if (!rootEl) {
      throw new Error("JobTracker: root element not found");
    }

    var config = Object.assign(
      {
        storageKey: "job-tracker-data",
        currency: "USD",
        statuses: [
          { value: "saved", label: "Saved" },
          { value: "applied", label: "Applied" },
          { value: "interview", label: "Interview" },
          { value: "offer", label: "Offer" },
          { value: "closed", label: "Closed" }
        ]
      },
      options || {}
    );

    var state = {
      jobs: loadJobs(config.storageKey),
      filterStatus: "all",
      searchQuery: "",
      editingId: null
    };

    rootEl.classList.add("jt");
    rootEl.innerHTML = buildShell(config.statuses);

    var searchInput = rootEl.querySelector("[data-role='search']");
    var statusFilter = rootEl.querySelector("[data-role='status-filter']");
    var listEl = rootEl.querySelector("[data-role='list']");
    var statsEl = rootEl.querySelector("[data-role='stats']");
    var emptyEl = rootEl.querySelector("[data-role='empty']");
    var modalEl = rootEl.querySelector("[data-role='modal']");
    var formEl = rootEl.querySelector("[data-role='form']");
    var modalTitleEl = rootEl.querySelector("[data-role='modal-title']");
    var jobInput = rootEl.querySelector("[data-role='job']");
    var statusInput = rootEl.querySelector("[data-role='status']");
    var payInput = rootEl.querySelector("[data-role='pay']");

    rootEl.querySelector("[data-role='add']").addEventListener("click", function () {
      openModal();
    });

    rootEl.querySelector("[data-role='modal-close']").addEventListener("click", function () {
      closeModal();
    });

    modalEl.addEventListener("click", function (event) {
      if (event.target === modalEl) {
        closeModal();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && modalEl.classList.contains("is-open")) {
        closeModal();
      }
    });

    searchInput.addEventListener("input", function (event) {
      state.searchQuery = event.target.value.trim().toLowerCase();
      render();
    });

    statusFilter.addEventListener("change", function (event) {
      state.filterStatus = event.target.value;
      render();
    });

    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      var jobValue = jobInput.value.trim();
      if (!jobValue) {
        jobInput.focus();
        return;
      }

      var payload = {
        job: jobValue,
        status: statusInput.value,
        pay: payInput.value.trim()
      };

      if (state.editingId) {
        var existing = state.jobs.find(function (item) {
          return item.id === state.editingId;
        });
        if (existing) {
          existing.job = payload.job;
          existing.status = payload.status;
          existing.pay = payload.pay;
        }
      } else {
        state.jobs.unshift({
          id: "job-" + Date.now().toString(36),
          job: payload.job,
          status: payload.status,
          pay: payload.pay,
          createdAt: Date.now()
        });
      }

      persistJobs(config.storageKey, state.jobs);
      closeModal();
      render();
    });

    listEl.addEventListener("click", function (event) {
      var actionBtn = event.target.closest("button[data-action]");
      if (!actionBtn) {
        return;
      }

      var action = actionBtn.getAttribute("data-action");
      var jobId = actionBtn.getAttribute("data-id");
      var job = state.jobs.find(function (item) {
        return item.id === jobId;
      });
      if (!job) {
        return;
      }

      if (action === "edit") {
        openModal(job);
        return;
      }

      if (action === "delete") {
        var confirmed = window.confirm("Delete this entry?");
        if (!confirmed) {
          return;
        }
        state.jobs = state.jobs.filter(function (item) {
          return item.id !== jobId;
        });
        persistJobs(config.storageKey, state.jobs);
        render();
      }
    });

    function openModal(job) {
      if (job) {
        state.editingId = job.id;
        modalTitleEl.textContent = "Edit entry";
        jobInput.value = job.job;
        statusInput.value = job.status;
        payInput.value = job.pay || "";
      } else {
        state.editingId = null;
        modalTitleEl.textContent = "Add a job";
        formEl.reset();
        statusInput.value = config.statuses[0].value;
      }

      modalEl.classList.add("is-open");
      jobInput.focus();
    }

    function closeModal() {
      modalEl.classList.remove("is-open");
      state.editingId = null;
      formEl.reset();
    }

    function render() {
      var filtered = state.jobs.filter(function (item) {
        var matchesStatus =
          state.filterStatus === "all" || item.status === state.filterStatus;
        if (!matchesStatus) {
          return false;
        }

        if (!state.searchQuery) {
          return true;
        }

        var haystack =
          (item.job + " " + item.status + " " + (item.pay || ""))
            .toLowerCase()
            .trim();
        return haystack.indexOf(state.searchQuery) !== -1;
      });

      listEl.innerHTML = filtered
        .map(function (item) {
          return buildCard(item, config.statuses, config.currency);
        })
        .join("");

      emptyEl.style.display = filtered.length ? "none" : "block";
      renderStats(statsEl, state.jobs, config.statuses);
    }

    render();

    return {
      getJobs: function () {
        return state.jobs.slice();
      },
      addJob: function (job) {
        if (!job || !job.job) {
          return;
        }
        state.jobs.unshift({
          id: "job-" + Date.now().toString(36),
          job: job.job,
          status: job.status || config.statuses[0].value,
          pay: job.pay || "",
          createdAt: Date.now()
        });
        persistJobs(config.storageKey, state.jobs);
        render();
      }
    };
  }

  function loadJobs(storageKey) {
    try {
      var raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return [];
      }
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function persistJobs(storageKey, jobs) {
    window.localStorage.setItem(storageKey, JSON.stringify(jobs));
  }

  function buildShell(statuses) {
    return (
      "<div class='jt__panel'>" +
      "  <header class='jt__header'>" +
      "    <div>" +
      "      <p class='jt__eyebrow'>Job Tracker</p>" +
      "      <h1 class='jt__title'>Opportunities</h1>" +
      "      <p class='jt__subtitle'>Keep offers, interview status, and pay in one place.</p>" +
      "    </div>" +
      "    <div class='jt__header-actions'>" +
      "      <button class='jt__primary' data-role='add' type='button'>Add job</button>" +
      "    </div>" +
      "  </header>" +
      "  <div class='jt__toolbar'>" +
      "    <label class='jt__field'>" +
      "      <span class='jt__label'>Search</span>" +
      "      <input class='jt__input' data-role='search' type='search' placeholder='Role, status, or pay' />" +
      "    </label>" +
      "    <label class='jt__field'>" +
      "      <span class='jt__label'>Status</span>" +
      "      <select class='jt__select' data-role='status-filter'>" +
      "        <option value='all'>All</option>" +
      buildStatusOptions(statuses) +
      "      </select>" +
      "    </label>" +
      "  </div>" +
      "  <section class='jt__stats' data-role='stats'></section>" +
      "  <section class='jt__list' data-role='list'></section>" +
      "  <div class='jt__empty' data-role='empty'>" +
      "    <p>No entries yet. Add the roles you are tracking.</p>" +
      "  </div>" +
      "</div>" +
      "<div class='jt__modal' data-role='modal'>" +
      "  <div class='jt__modal-card' role='dialog' aria-modal='true'>" +
      "    <div class='jt__modal-header'>" +
      "      <h2 class='jt__modal-title' data-role='modal-title'>Add a job</h2>" +
      "      <button class='jt__icon-btn' type='button' data-role='modal-close' aria-label='Close'>x</button>" +
      "    </div>" +
      "    <form class='jt__form' data-role='form'>" +
      "      <label class='jt__field'>" +
      "        <span class='jt__label'>Job</span>" +
      "        <input class='jt__input' data-role='job' type='text' placeholder='Role or title' required />" +
      "      </label>" +
      "      <label class='jt__field'>" +
      "        <span class='jt__label'>Status</span>" +
      "        <select class='jt__select' data-role='status'>" +
      buildStatusOptions(statuses) +
      "        </select>" +
      "      </label>" +
      "      <label class='jt__field'>" +
      "        <span class='jt__label'>Pay</span>" +
      "        <input class='jt__input' data-role='pay' type='text' placeholder='120000 or $120k' />" +
      "      </label>" +
      "      <div class='jt__form-actions'>" +
      "        <button class='jt__ghost' type='button' data-role='modal-close'>Cancel</button>" +
      "        <button class='jt__primary' type='submit'>Save</button>" +
      "      </div>" +
      "    </form>" +
      "  </div>" +
      "</div>"
    );
  }

  function buildStatusOptions(statuses) {
    return statuses
      .map(function (status) {
        return "<option value='" + status.value + "'>" + status.label + "</option>";
      })
      .join("");
  }

  function buildCard(job, statuses, currency) {
    var label = getStatusLabel(job.status, statuses);
    var payLabel = formatPay(job.pay, currency);
    var pillClass = "jt__pill jt__pill--" + sanitizeStatus(job.status);

    return (
      "<article class='jt__card'>" +
      "  <div>" +
      "    <p class='jt__card-title'>" +
      escapeHtml(job.job) +
      "    </p>" +
      "    <div class='jt__meta'>" +
      "      <span class='" +
      pillClass +
      "'>" +
      label +
      "</span>" +
      "    </div>" +
      "  </div>" +
      "  <div class='jt__card-pay'>" +
      escapeHtml(payLabel) +
      "  </div>" +
      "  <div class='jt__card-actions'>" +
      "    <button class='jt__link' data-action='edit' data-id='" +
      job.id +
      "' type='button'>Edit</button>" +
      "    <button class='jt__link jt__danger' data-action='delete' data-id='" +
      job.id +
      "' type='button'>Delete</button>" +
      "  </div>" +
      "</article>"
    );
  }

  function renderStats(container, jobs, statuses) {
    var total = jobs.length;
    var counts = statuses.map(function (status) {
      return {
        label: status.label,
        value: jobs.filter(function (job) {
          return job.status === status.value;
        }).length,
        key: status.value
      };
    });

    container.innerHTML =
      "<div class='jt__stat'>" +
      "  <p class='jt__stat-label'>Total</p>" +
      "  <p class='jt__stat-value'>" +
      total +
      "</p>" +
      "</div>" +
      counts
        .map(function (item) {
          return (
            "<div class='jt__stat'>" +
            "  <p class='jt__stat-label'>" +
            item.label +
            "</p>" +
            "  <p class='jt__stat-value'>" +
            item.value +
            "</p>" +
            "</div>"
          );
        })
        .join("");
  }

  function formatPay(raw, currency) {
    if (!raw) {
      return "Not set";
    }

    var trimmed = String(raw).trim();
    if (!trimmed) {
      return "Not set";
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      var amount = Number(trimmed);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0
      }).format(amount);
    }

    return trimmed;
  }

  function getStatusLabel(value, statuses) {
    var found = statuses.find(function (status) {
      return status.value === value;
    });
    return found ? found.label : value;
  }

  function sanitizeStatus(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.JobTracker = {
    create: createJobTracker
  };
})();
