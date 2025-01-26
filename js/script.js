const STORAGE_KEY = "workSessions";
let currentSession = JSON.parse(localStorage.getItem("currentSession")) || null;

// Format dates and times
function formatDate(date) {
    return date.toLocaleString("en-US", { weekday: "short" }) + " " + date.getDate() + "-" + (date.getMonth() + 1);
}

function formatTime(date) {
    return date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function calculateDuration(start, end) {
    const diffMs = end - start;
    const totalMinutes = Math.round(diffMs / (1000 * 60) / 5) * 5; // Round to 5 mins
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
}

// Retrieve stored sessions from localStorage
function getStoredSessions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

function saveSession(session) {
    const sessions = getStoredSessions();
    sessions.push(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

// Render all sessions in the table
function renderSessions() {
    const sessions = getStoredSessions();
    const tableBody = document.querySelector("#sessions-table tbody");
    tableBody.innerHTML = "";

    let weeklyMinutes = 0;
    const dailyDurations = {};

    sessions.forEach((session) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${session.date}</td>
            <td>${session.startTime}</td>
            <td>${session.endTime || "--"}</td>
            <td>${session.duration || "--"}</td>
        `;
        tableBody.appendChild(row);

        if (session.duration) {
            const durationParts = session.duration.split(/[hm]/).map(Number);
            const totalMinutes = (durationParts[0] || 0) * 60 + (durationParts[1] || 0);
            weeklyMinutes += totalMinutes;

            dailyDurations[session.date] = (dailyDurations[session.date] || 0) + totalMinutes;
        }
    });

    // Update weekly summary
    const weeklyHours = Math.floor(weeklyMinutes / 60);
    const weeklyRemainder = weeklyMinutes % 60;
    document.getElementById("weekly-summary").innerText = `Weekly Total: ${weeklyHours}h ${weeklyRemainder}m`;

    renderChart(dailyDurations);
}

function renderChart(dailyDurations) {
    const ctx = document.getElementById("weeklyChart").getContext("2d");
    const labels = Object.keys(dailyDurations);
    const data = Object.values(dailyDurations).map(minutes => (minutes / 60).toFixed(2));

    new Chart(ctx, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Hours Worked",
                data,
                backgroundColor: "#337ab7",
                borderColor: "#286090",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Hours"
                    }
                }
            }
        }
    });
}

// Event listeners
document.getElementById("start").addEventListener("click", () => {
    if (currentSession) {
        alert("A session is already active!");
        return;
    }

    const now = new Date();
    currentSession = { startTime: now, date: formatDate(now) };
    localStorage.setItem("currentSession", JSON.stringify(currentSession));
    document.getElementById("output").innerText = `Started at: ${formatTime(now)}`;
});

document.getElementById("pause").addEventListener("click", () => {
    if (!currentSession) {
        alert("No active session to pause!");
        return;
    }

    const now = new Date();
    const duration = calculateDuration(new Date(currentSession.startTime), now);

    const session = {
        date: currentSession.date,
        startTime: formatTime(new Date(currentSession.startTime)),
        endTime: formatTime(now),
        duration
    };

    saveSession(session);
    currentSession = null;
    localStorage.removeItem("currentSession");
    document.getElementById("output").innerText = "Session paused.";
    renderSessions();
});

document.getElementById("clear-data").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all data?")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("currentSession");
        currentSession = null;
        document.getElementById("output").innerText = "All data cleared!";
        renderSessions();
    }
});

document.getElementById("export-csv").addEventListener("click", () => {
    const sessions = getStoredSessions();
    const csvRows = [
        ["Date", "Start Time", "End Time", "Duration"],
        ...sessions.map(session => [session.date, session.startTime, session.endTime || "--", session.duration || "--"])
    ];

    const csvContent = csvRows.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "work_sessions.csv";
    a.click();
    URL.revokeObjectURL(url);
});

renderSessions();
