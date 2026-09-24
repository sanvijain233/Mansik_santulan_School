"use strict";

const API_BASE = "https://mansik-santulan-backend.onrender.com";

const form = document.getElementById("predict-form");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const errorRetryBtn = document.getElementById("error-retry-btn");

const stateIdle = document.getElementById("state-idle");
const stateLoading = document.getElementById("state-loading");
const stateResult = document.getElementById("state-result");
const stateError = document.getElementById("state-error");

const scoreNumberEl = document.getElementById("score-number");
const scoreBandEl = document.getElementById("score-band");
const scoreContextEl = document.getElementById("score-context");
const gaugeFill = document.getElementById("gauge-fill");

const errorLabelEl = document.getElementById("error-label");
const errorCopyEl = document.getElementById("error-copy");

const stressButtons = document.querySelectorAll("[data-stress]");
const stressInput = document.getElementById("stress-level");

const GAUGE_ARC_LENGTH = 314;

function showState(state) {
    const states = [
        stateIdle,
        stateLoading,
        stateResult,
        stateError
    ];

    states.forEach((element) => {
        if (element) {
            element.hidden = true;
        }
    });

    if (state === "idle" && stateIdle) {
        stateIdle.hidden = false;
    }

    if (state === "loading" && stateLoading) {
        stateLoading.hidden = false;
    }

    if (state === "result" && stateResult) {
        stateResult.hidden = false;
    }

    if (state === "error" && stateError) {
        stateError.hidden = false;
    }
}


function bandFor(score) {
    if (score < 4) {
        return {
            label: "Signal: strained",
            context: "The current pattern suggests that some daily habits may need attention."
        };
    }

    if (score < 7) {
        return {
            label: "Signal: balanced",
            context: "The current pattern looks relatively balanced across the measured factors."
        };
    }

    return {
        label: "Signal: strong",
        context: "The current pattern shows relatively strong indicators across the measured factors."
    };
}


function renderResult(score) {
    const numericScore = Number(score);

    if (!Number.isFinite(numericScore)) {
        showError(
            "Unexpected response",
            "The server returned an invalid score."
        );
        return;
    }

    const clampedScore = Math.max(
        0,
        Math.min(10, numericScore)
    );

    const result = bandFor(clampedScore);

    if (scoreNumberEl) {
        scoreNumberEl.textContent = numericScore.toFixed(2);
    }

    if (scoreBandEl) {
        scoreBandEl.textContent = result.label;
    }

    if (scoreContextEl) {
        scoreContextEl.textContent = result.context;
    }

    if (gaugeFill) {
        gaugeFill.style.transition = "none";
        gaugeFill.style.strokeDashoffset = String(
            GAUGE_ARC_LENGTH
        );

        requestAnimationFrame(() => {
            gaugeFill.style.transition = "";

            const offset =
                GAUGE_ARC_LENGTH *
                (1 - clampedScore / 10);

            gaugeFill.style.strokeDashoffset =
                String(offset);
        });
    }

    showState("result");
}


function showError(label, message) {
    if (errorLabelEl) {
        errorLabelEl.textContent = label;
    }

    if (errorCopyEl) {
        errorCopyEl.textContent = message;
    }

    showState("error");
}


function getValue(id) {
    const element = document.getElementById(id);

    if (!element) {
        return "";
    }

    return element.value;
}


function buildPayload() {
    return {
        age: Number(getValue("age")),

        gender: getValue("gender"),

        country: getValue("country"),

        academic_level: getValue("academic-level"),

        most_used_platform: getValue("most-used-platform"),

        purpose_of_use: getValue("purpose-of-use"),

        avg_daily_usage_hours: Number(
            getValue("avg-daily-usage-hours")
        ),

        daily_unlocks: Number(
            getValue("daily-unlocks")
        ),

        study_hours: Number(
            getValue("study-hours")
        ),

        physical_activity_hours: Number(
            getValue("physical-activity-hours")
        ),

        sleep_hours_per_night: Number(
            getValue("sleep-hours-per-night")
        ),

        stress_level: getValue("stress-level")
    };
}


function validatePayload(payload) {

    if (
        !Number.isInteger(payload.age) ||
        payload.age < 10 ||
        payload.age > 100
    ) {
        return "Please enter a valid age between 10 and 100.";
    }

    if (!payload.gender) {
        return "Please select gender.";
    }

    if (!payload.country) {
        return "Please select country.";
    }

    if (!payload.academic_level) {
        return "Please select academic level.";
    }

    if (!payload.most_used_platform) {
        return "Please select most used platform.";
    }

    if (!payload.purpose_of_use) {
        return "Please select purpose of use.";
    }

    if (
        !Number.isFinite(payload.avg_daily_usage_hours) ||
        payload.avg_daily_usage_hours < 0 ||
        payload.avg_daily_usage_hours > 24
    ) {
        return "Please enter valid daily usage hours.";
    }

    if (
        !Number.isInteger(payload.daily_unlocks) ||
        payload.daily_unlocks < 0
    ) {
        return "Please enter valid daily unlocks.";
    }

    if (
        !Number.isFinite(payload.study_hours) ||
        payload.study_hours < 0 ||
        payload.study_hours > 24
    ) {
        return "Please enter valid study hours.";
    }

    if (
        !Number.isFinite(payload.physical_activity_hours) ||
        payload.physical_activity_hours < 0 ||
        payload.physical_activity_hours > 24
    ) {
        return "Please enter valid physical activity hours.";
    }

    if (
        !Number.isFinite(payload.sleep_hours_per_night) ||
        payload.sleep_hours_per_night < 0 ||
        payload.sleep_hours_per_night > 24
    ) {
        return "Please enter valid sleep hours.";
    }

    if (!payload.stress_level) {
        return "Please select stress level.";
    }

    return null;
}


stressButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const value = button.dataset.stress;

        if (stressInput) {
            stressInput.value = value;
        }

        stressButtons.forEach((btn) => {
            btn.classList.remove("active");
            btn.setAttribute("aria-pressed", "false");
        });

        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
    });

});


async function predict() {

    const payload = buildPayload();

    console.log("Sending data:", payload);

    const validationError =
        validatePayload(payload);

    if (validationError) {

        showError(
            "Invalid input",
            validationError
        );

        return;
    }

    showState("loading");

    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {

        const res = await fetch(
            `${API_BASE}/predict`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(payload)
            }
        );

        console.log(
            "API Status:",
            res.status
        );

        const data = await res.json();

        console.log(
            "API RESPONSE:",
            data
        );

        if (!res.ok) {

            if (res.status === 422) {

                showError(
                    "Invalid data",
                    "The submitted data does not match the required format."
                );

            } else {

                showError(
                    "Prediction failed",
                    "The server could not process your prediction."
                );
            }

            return;
        }

        const score =
            Number(
                data.predicted_mental_health_score
            );

        console.log(
            "PREDICTED SCORE:",
            score
        );

        if (!Number.isFinite(score)) {

            showError(
                "Unexpected response",
                "The server did not return a valid mental health score."
            );

            return;
        }

        renderResult(score);

    } catch (error) {

        console.error(
            "API ERROR:",
            error
        );

        showError(
            "Can't reach the server",
            "Please check your internet connection and try again."
        );

    } finally {

        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
}


if (form) {

    form.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            await predict();
        }
    );

}


if (resetBtn) {

    resetBtn.addEventListener(
        "click",
        () => {

            if (form) {
                form.reset();
            }

            if (stressInput) {
                stressInput.value = "";
            }

            stressButtons.forEach(
                (button) => {
                    button.classList.remove("active");
                    button.setAttribute(
                        "aria-pressed",
                        "false"
                    );
                }
            );

            showState("idle");
        }
    );

}


if (errorRetryBtn) {

    errorRetryBtn.addEventListener(
        "click",
        () => {
            showState("idle");
        }
    );

}


document.querySelectorAll(
    ".gauge-ticks"
).forEach((g) => {

    g.innerHTML = "";

    const cx = 120;
    const cy = 140;

    const rOuter = 100;
    const rInner = 90;

    for (let i = 0; i <= 10; i += 2) {

        const angle =
            Math.PI -
            (i / 10) * Math.PI;

        const x1 =
            cx +
            rOuter *
            Math.cos(angle);

        const y1 =
            cy -
            rOuter *
            Math.sin(angle);

        const x2 =
            cx +
            rInner *
            Math.cos(angle);

        const y2 =
            cy -
            rInner *
            Math.sin(angle);

        const line =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "line"
            );

        line.setAttribute(
            "x1",
            x1.toFixed(1)
        );

        line.setAttribute(
            "y1",
            y1.toFixed(1)
        );

        line.setAttribute(
            "x2",
            x2.toFixed(1)
        );

        line.setAttribute(
            "y2",
            y2.toFixed(1)
        );

        g.appendChild(line);
    }

});


showState("idle");