document.addEventListener("DOMContentLoaded", async function () {
  try {
    const response = await fetch("/season1Statistics");
    const data = await response.json();

    const tableBody = document
      .getElementById("statistics-table")
      .getElementsByTagName("tbody")[0];

    // Verifică dacă datele sunt disponibile
    if (data.length === 0) {
      const row = tableBody.insertRow();
      const messageCell = row.insertCell(0);
      messageCell.colSpan = 2; // Fă ca celula să ocupe 2 coloane
      messageCell.textContent =
        "Nu există statistici disponibile pentru sezonul 1.";
      return;
    }

    data.forEach((player) => {
      const row = tableBody.insertRow();
      const nameCell = row.insertCell(0);
      const goalsCell = row.insertCell(1);

      nameCell.textContent = player.name;
      goalsCell.textContent = player.totalGoals || 0; // Afișează 0 dacă nu are goluri
    });
  } catch (error) {
    console.error("Eroare la obținerea statisticilor:", error);
  }
});
