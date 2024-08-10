document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });
  const playerSearchInput = document.getElementById("playerSearch");
  const searchSuggestions = document.getElementById("searchSuggestions");

  playerSearchInput.addEventListener("input", async () => {
    const nameInput = playerSearchInput.value.trim();

    if (nameInput.length > 0) {
      try {
        const response = await fetch(`/searchPlayer?name=${nameInput}`);
        const suggestions = await response.json();

        searchSuggestions.innerHTML = "";

        if (suggestions.length > 0) {
          suggestions.forEach((suggestion) => {
            const li = document.createElement("li");
            li.textContent = suggestion.name;
            li.addEventListener("click", () => {
              const userId = suggestion.id;
              const profileUrl = `/profile.html?id=${userId}`;
              window.location.href = profileUrl;
            });
            searchSuggestions.appendChild(li);
          });
        }
      } catch (error) {
        console.error("Eroare la obținerea sugestiilor:", error);
      }
    } else {
      searchSuggestions.innerHTML = "";
    }
  });

  // Oprește submit-ul formularului de căutare
  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
  });
  async function fetchUserDetails() {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get("id");

    if (!userId) {
      console.error("ID utilizator lipsă în URL.");
      return;
    }

    try {
      const response = await fetch(`/users/${userId}`);
      if (!response.ok) {
        throw new Error("Eroare la preluarea detaliilor utilizatorului.");
      }

      const user = await response.json();
      document.getElementById("userProfilePic").src = user.profilePic;
      document.getElementById("userName").textContent = `${user.name}`;
      document.getElementById(
        "userGames"
      ).textContent = `${user.matches_played}`;
      document.getElementById("userGoals").textContent = `${user.goals}`;
      document.getElementById("userAssists").textContent = `${user.assists}`;
      document.getElementById("userCS").textContent = `${user.cleansheets}`;
      document.getElementById("teamName").textContent =
        user.team_name || "None";
      document.getElementById("teamLogo").src =
        user.team_logo || "default_logo.png";
      document.getElementById("currentSeason").textContent =
        user.season_name || "N/A";

      // Fetch career history
      const careerHistoryResponse = await fetch(`/careerHistory/${user.id}`);
      const careerHistory = await careerHistoryResponse.json();
      const careerHistoryList = document.getElementById("careerHistoryList");

      // Clear any previous rows
      careerHistoryList.innerHTML = "";

      // Populate career history table
      careerHistory.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
    <td>
      <img src="${
        item.team_logo || "default_logo.png"
      }" alt="Team Logo" class="team-logo" />
      ${item.team_name}
    </td>
    <td>${item.season_name || "N/A"}</td>
    <td>${item.matches_played}</td>
    <td>${item.goals}</td>
    <td>${item.assists}</td>
    <td>${item.cleansheets}</td>
  `;
        careerHistoryList.appendChild(row);
      });

      // Fetch and display trophies
      const trophiesList = document.getElementById("trophiesList");
      trophiesList.innerHTML = ""; // Clear previous trophies

      user.trophies.forEach((trophy) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <img src="${trophy.trophy_image}" alt="${trophy.trophy_name}" class="trophy-image" />
        `;
        trophiesList.appendChild(li);
      });

      // Fetch all-time stats
      const allTimeStatsResponse = await fetch(`/allTimeStats/${user.name}`);
      const allTimeStats = await allTimeStatsResponse.json();
      document.getElementById("totalGames").textContent =
        allTimeStats.totalMatchesPlayed;
      document.getElementById("totalGoals").textContent =
        allTimeStats.totalGoals;
      document.getElementById("totalAssists").textContent =
        allTimeStats.totalAssists;
      document.getElementById("totalCS").textContent =
        allTimeStats.totalCleansheets;
    } catch (error) {
      console.error("Eroare la obținerea detaliilor utilizatorului:", error);
    }
  }

  fetchUserDetails();
});
