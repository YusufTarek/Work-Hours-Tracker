const STORAGE_KEY = "workSessions";
let currentSession = JSON.parse(localStorage.getItem("currentSession")) || null;
let liveCounterInterval = null;

// Format date and time
function formatDate(date) {
    return date.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(date) {
    return date.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// Calculate duration and round to 5 mins
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

// Render sessions grouped by date with total hours per day
function renderSessions() {
    const sessions = getStoredSessions();
    const tableBody = document.querySelector("#sessions-table tbody");
    tableBody.innerHTML = "";

    // Group sessions by date
    const groupedByDate = sessions.reduce((acc, session) => {
        acc[session.date] = acc[session.date] || [];
        acc[session.date].push(session);
        return acc;
    }, {});

    let weeklyMinutes = 0;
    const dailyDurations = {};

    Object.keys(groupedByDate).forEach((date) => {
        const totalMinutes = groupedByDate[date].reduce((sum, session) => {
            const durationParts = session.duration.split(/[hm]/).map(Number);
            return sum + (durationParts[0] || 0) * 60 + (durationParts[1] || 0);
        }, 0);

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        dailyDurations[date] = totalMinutes;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${date}</td>
            <td>${hours}h ${minutes}m</td>
        `;
        tableBody.appendChild(row);

        weeklyMinutes += totalMinutes;
    });

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

// Update live counter for active session
function startLiveCounter() {
    if (!currentSession) return;
    if (liveCounterInterval) clearInterval(liveCounterInterval);

    liveCounterInterval = setInterval(() => {
        const now = new Date();
        const duration = calculateDuration(new Date(currentSession.startTime), now);
        document.getElementById("live-counter").innerText = `Duration: ${duration}`;
    }, 1000);
}

// Stop live counter
function stopLiveCounter() {
    clearInterval(liveCounterInterval);
    document.getElementById("live-counter").innerText = "Duration: 0h 0m";
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
    startLiveCounter();
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
    stopLiveCounter();
    renderSessions();
});

document.getElementById("clear-data").addEventListener("click", () => {
    if (confirm("Are you sure you want to clear all data?")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("currentSession");
        currentSession = null;
        document.getElementById("output").innerText = "All data cleared!";
        stopLiveCounter();
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
