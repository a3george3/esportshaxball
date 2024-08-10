document.addEventListener("DOMContentLoaded", async function () {
  /* TOGGLE NAVBAR */
  const menuToggle = document.getElementById("mobile-menu");
  const navLinks = document.getElementById("nav-links");
  const authLink = document.getElementById("auth-link");
  const token = localStorage.getItem("token");
  const userId = localStorage.getItem("userId");

  if (token && userId) {
    authLink.innerHTML = `<a href="profile.html?id=${userId}">My Profile</a>`;
  }
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

  // Obține numărul total de utilizatori și actualizează div-ul
  try {
    const response = await fetch("/totalUsers");
    const data = await response.json();

    // Afișează numărul de utilizatori în div-ul dorit
    const registeredUsersDiv = document.querySelector(".registered");
    registeredUsersDiv.textContent = `Accounts created: ${data.total}`;
  } catch (error) {
    console.error("Eroare la obținerea numărului de utilizatori:", error);
  }

  menuToggle.addEventListener("click", function () {
    navLinks.classList.toggle("show");

    // const authLink = document.getElementById("auth-link");

    // // Verifică dacă există un token în localStorage
    // const token = localStorage.getItem("token");

    // if (token) {
    //   // Dacă utilizatorul este conectat, schimbă link-ul în "Logout"
    //   authLink.innerHTML = `<a href="#" class="logout-button">Logout</a>`;

    //   // Adaugă un event listener pentru logout
    //   const logoutButton = authLink.querySelector(".logout-button");
    //   logoutButton.addEventListener("click", async () => {
    //     // Aici ar trebui să adaugi logica pentru a deconecta utilizatorul, de obicei prin a apela un endpoint de logout
    //     localStorage.removeItem("token"); // Șterge token-ul
    //     alert("Deconectare reușită!"); // Afișează un mesaj de confirmare
    //     window.location.reload(); // Reîncarcă pagina pentru a actualiza starea
    //   });
    // }
  });

  // SWIPE STATS

  const container = document.querySelector(".cards-container");

  let isDown = false;
  let startX;
  let scrollLeft;

  container.addEventListener("mousedown", (e) => {
    isDown = true;
    container.classList.add("active");
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
  });

  container.addEventListener("mouseleave", () => {
    isDown = false;
    container.classList.remove("active");
  });

  container.addEventListener("mouseup", () => {
    isDown = false;
    container.classList.remove("active");
  });

  container.addEventListener("mousemove", (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 3;
    container.scrollLeft = scrollLeft - walk;
  });

  populateLeagueTable();
  populateGoalsStats();
  populateAssistsStats();
  populateCSStats();
  populateGoalsTeamStats();
});

/* LEAGUE TABLE */

async function fetchTeamsData() {
  try {
    const response = await fetch("teams.json");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching the teams data:", error);
  }
}

async function populateLeagueTable() {
  const teams = await fetchTeamsData();
  if (teams) {
    teams.forEach((team) => {
      team.goalDifference = team.goalsScored - team.goalsConceded;
    });

    teams.sort((a, b) => b.points - a.points);
    const tableBody = document.getElementById("leagueTableBody");
    tableBody.innerHTML = ""; // Clear existing rows

    teams.forEach((team, index) => {
      const row = document.createElement("tr");

      const goalDifference =
        team.goalDifference > 0
          ? `+${team.goalDifference}`
          : team.goalDifference;

      row.innerHTML = `
        <td>${index + 1}</td>
        <td>
          <div class="club">
            <img src="${team.logo}" alt="${team.name} Logo" />
            <span>${team.name}</span>
          </div>
        </td>
        <td>${team.points}</td>
        <td>${team.played}</td>
        <td>${goalDifference}</td>
      `;

      tableBody.appendChild(row);
    });
  }
}

// PLAYER STATS

async function fetchPlayerStats() {
  try {
    const response = await fetch("players.json");
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching the players data:", error);
  }
}

// GOALS

// async function populateGoalsStats() {
//   const playersGoals = await fetchPlayerStats();
//   if (playersGoals) {
//     playersGoals.sort((a, b) => b.goals - a.goals); // Sort players by goals
//     const topGoals = playersGoals.slice(0, 5);
//     const playersCard = document.getElementById("playersStatsCard");
//     console.log(playersCard);
//     playersCard.innerHTML = ""; // Clear existing content

//     playersAssists.forEach((playerAssist, index) => {
//       const div = document.createElement("div");
//       div.classList.add("player");
//       if (index == 0) {
//         div.classList.add("change-background");
//         div.innerHTML = `
//         <div class="pStats1st">${index + 1} <img src="${
//           playerAssist.team
//         }" alt="${playerAssist.team} Logo" /><span class="pName1st">${
//           playerAssist.name
//         }</span></div>
//         <p class="pGoals1st">${playerAssist.goals}</p>
//       `;
//       } else {
//         div.innerHTML = `
//         <div class="pStats">${index + 1} <img src="${playerAssist.team}" alt="${
//           playerAssist.team
//         } Logo" /><span class="pName">${playerAssist.name}</span></div>
//         <p class="pGoals">${playerAssist.goals}</p>
//       `;
//       }
//       //   div.innerHTML = `
//       //     <div class="pStats">${index + 1} <img src="${playerAssist.team}" alt="${
//       //     playerAssist.team
//       //   } Logo" /><span class="pName">${playerAssist.name}</span></div>
//       //     <p class="pGoals">${playerAssist.goals}</p>
//       //   `;

//       playersCard1.appendChild(div);
//     });
//     const viewFullListButton = document.createElement("button");
//     viewFullListButton.textContent = "See all statistics";
//     viewFullListButton.classList.add("statistics-button");
//     viewFullListButton.addEventListener("click", () => {
//       // Handle the click event
//       // Example: Redirect to another page with full list
//       window.location.href = "full-list.html";
//     });
//     playersCard1.appendChild(viewFullListButton);
//   }
// }

async function populateGoalsStats() {
  const playersGoals = await fetchPlayerStats();
  if (playersGoals) {
    playersGoals.sort((a, b) => b.goals - a.goals); // Sort players by goals
    const topGoals = playersGoals.slice(0, 5);
    const playersCard = document.getElementById("playersStatsCard");
    console.log(playersCard);
    playersCard.innerHTML = ""; // Clear existing content

    topGoals.forEach((player, index) => {
      const div = document.createElement("div");
      div.classList.add("player");
      if (index == 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">${index + 1} <img src="${player.team}" alt="${
          player.team
        } Logo" /><span class="pName1st">${player.name}</span></div>
          <p class="pGoals1st">${player.goals}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">${index + 1} <img src="${player.team}" alt="${
          player.team
        } Logo" /><span class="pName">${player.name}</span></div>
          <p class="pGoals">${player.goals}</p>
        `;
      }
      playersCard.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      // Handle the click event
      // Example: Redirect to another page with full list
      window.location.href = "full-list.html";
    });
    playersCard.appendChild(viewFullListButton);
  }
}

// Call the function to fetch and display players' goals stats

// ASSISTS

async function populateAssistsStats() {
  const playersAssists = await fetchPlayerStats(); // Corrected variable name
  if (playersAssists) {
    // Corrected variable name
    playersAssists.sort((a, b) => b.assists - a.assists); // Sort players by assists
    const topAssists = playersAssists.slice(0, 5);
    const playersCard1 = document.getElementById("playersAssistsCard");
    console.log(playersCard1);
    playersCard1.innerHTML = ""; // Clear existing content

    topAssists.forEach((playerAssist, index) => {
      const div = document.createElement("div");
      div.classList.add("player");
      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">${index + 1} <img src="${
          playerAssist.team
        }" alt="${playerAssist.team} Logo" /><span class="pName1st">${
          playerAssist.name
        }</span></div>
          <p class="pGoals1st">${playerAssist.assists}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">${index + 1} <img src="${
          playerAssist.team
        }" alt="${playerAssist.team} Logo" /><span class="pName">${
          playerAssist.name
        }</span></div>
          <p class="pGoals">${playerAssist.assists}</p>
        `;
      }
      playersCard1.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      // Handle the click event
      // Example: Redirect to another page with full list
      window.location.href = "full-list.html";
    });
    playersCard1.appendChild(viewFullListButton);
  }
}

// CLEAN SHEETS

async function populateCSStats() {
  const playersCS = await fetchPlayerStats();
  if (playersCS) {
    playersCS.sort((a, b) => b.CS - a.CS); // Sort players by clean sheets
    const topCS = playersCS.slice(0, 5);
    const playersCard2 = document.getElementById("playersCSCard");
    console.log(playersCard2);
    playersCard2.innerHTML = ""; // Clear existing content

    topCS.forEach((playerCS, index) => {
      const div = document.createElement("div");
      div.classList.add("player");
      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">${index + 1} <img src="${
          playerCS.team
        }" alt="${playerCS.team} Logo" /><span class="pName1st">${
          playerCS.name
        }</span></div>
          <p class="pGoals1st">${playerCS.CS}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">${index + 1} <img src="${playerCS.team}" alt="${
          playerCS.team
        } Logo" /><span class="pName">${playerCS.name}</span></div>
          <p class="pGoals">${playerCS.CS}</p>
        `;
      }
      playersCard2.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      // Handle the click event
      // Example: Redirect to another page with full list
      window.location.href = "full-list.html";
    });
    playersCard2.appendChild(viewFullListButton);
  }
}

// GOALS SCORED BY TEAMS

async function populateGoalsTeamStats() {
  const teamsGoals = await fetchTeamsData();
  if (teamsGoals) {
    teamsGoals.sort((a, b) => b.goalsScored - a.goalsScored); // Sort teams by goals scored
    const topTeams = teamsGoals.slice(0, 5); // Get the top 5 teams
    const teamsGoalsCard = document.getElementById("teamsGoalsCard");
    teamsGoalsCard.innerHTML = ""; // Clear existing content

    topTeams.forEach((team, index) => {
      const div = document.createElement("div");
      div.classList.add("player");
      if (index === 0) {
        div.classList.add("change-background");
        div.innerHTML = `
          <div class="pStats1st">${index + 1} <img src="${team.logo}" alt="${
          team.name
        } Logo" /><span class="pName1st">${team.name}</span></div>
          <p class="pGoals1st">${team.goalsScored}</p>
        `;
      } else {
        div.innerHTML = `
          <div class="pStats">${index + 1} <img src="${team.logo}" alt="${
          team.name
        } Logo" /><span class="pName">${team.name}</span></div>
          <p class="pGoals">${team.goalsScored}</p>
        `;
      }
      teamsGoalsCard.appendChild(div);
    });

    const viewFullListButton = document.createElement("button");
    viewFullListButton.textContent = "See all statistics";
    viewFullListButton.classList.add("statistics-button");
    viewFullListButton.addEventListener("click", () => {
      // Handle the click event
      // Example: Redirect to another page with full list
      window.location.href = "full-list.html";
    });
    teamsGoalsCard.appendChild(viewFullListButton);
  }
}

// Call the function to fetch and display team goals stats

// async function fetchLeaderboardData() {
//   try {
//     const response = await fetch(
//       "https://www.neatqueue.com/leaderboard/1120686602176442470/1155646661348032542"
//     ); // Replace 'API_URL' with the actual API endpoint
//     const data = await response.json();
//     console.log(data);

//     // data.forEach((player) => {
//     //   console.log(
//     //     `Name: ${player.name}, MMR: ${player.mmr}, Win-Loss: ${player.winLoss}`
//     //   );
//     // });
//   } catch (error) {
//     console.error("Error fetching the leaderboard data:", error);
//   }
// }

// fetchLeaderboardData();
