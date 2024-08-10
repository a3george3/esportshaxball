const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const path = require("path");
const cors = require("cors");
const multer = require("multer");

const app = express();
const port = 3000;

// Configurare baza de date MySQL
const dbConfig = {
  host: "localhost",
  user: "root",
  password: "tester12",
  database: "mydatabase",
};

// Secretul pentru JWT
const jwtSecret =
  "uK9!xP2@vQ7#hD6$eB4%rT8&fL1*zM3^jW5(yN0)qE9*sR2@lF7#zH8&kJ1$uT4";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/; // Tipuri de fișiere acceptate
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Tip de fișier invalid. Acceptăm doar imagini."));
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(express.static(path.join(__dirname))); // Servește fișiere statice
app.use("/uploads", express.static("uploads"));

// Verificare conexiune la baza de date
async function checkDatabaseConnection() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log("Conexiune la baza de date realizată cu succes!");
    await connection.end();
  } catch (err) {
    console.error("Eroare la conectarea la baza de date:", err.message);
  }
}

checkDatabaseConnection();

// Middleware pentru verificarea token-ului
// function verifyToken(req, res, next) {
//   const token = req.headers["authorization"];
//   if (!token) {
//     return res.status(403).json({ message: "Token-ul este necesar." });
//   }

//   jwt.verify(token, jwtSecret, (err, decoded) => {
//     if (err) {
//       return res.status(403).json({ message: "Token invalid." });
//     }
//     req.user = decoded;
//     next();
//   });
// }

// Middleware pentru verificarea token-ului
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("Token is missing."); // Log pentru debugging
    return res.status(403).json({ message: "Token-ul este necesar." });
  }

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      console.log("Invalid token:", err); // Log pentru debugging
      return res.status(403).json({ message: "Token invalid." });
    }
    req.user = decoded;
    console.log("Token valid:", req.user); // Log pentru debugging
    next();
  });
}

// Endpoint pentru înregistrare
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [existingUser] = await connection.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).send("Email-ul este deja utilizat.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = { name, email, password: hashedPassword };

    await connection.query("INSERT INTO users SET ?", user);
    await connection.end();

    res.send(`
      <!DOCTYPE html>
      <html lang="ro">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Înscriere reușită</title>
      </head>
      <body>
          <h1>Înregistrare reușită!</h1>
          <p>Contul tău a fost creat cu succes.</p>
          <a href="/login.html">Înapoi la pagina de logare</a>
      </body>
      </html>
    `);
  } catch (err) {
    console.error("Eroare la înregistrarea userului:", err);
    res.status(500).send(`Eroare la înregistrarea userului: ${err.message}`);
  }
});

// Endpoint pentru obținerea numărului total de utilizatori
app.get("/totalUsers", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(
      "SELECT COUNT(*) as total FROM users"
    );
    await connection.end();

    res.json({ total: rows[0].total });
  } catch (err) {
    console.error("Eroare la obținerea numărului total de utilizatori:", err);
    res.status(500).send("Eroare la obținerea numărului total de utilizatori.");
  }
});

// Endpoint pentru autentificare
app.post("/login", async (req, res) => {
  const { name, password } = req.body;

  // Verifică dacă utilizatorul este deja conectat
  const token = req.headers["authorization"];
  if (token) {
    return res.status(403).send("Utilizatorul este deja conectat.");
  }

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(
      "SELECT * FROM users WHERE name = ?",
      [name]
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(401).send("Username or password wrong!");
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).send("Username or password wrong!");
    }

    // Logare reușită
    const newToken = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      jwtSecret,
      { expiresIn: "1h" }
    );

    // Afișează mesajul de logare reușită
    res.json({ token: newToken, name: user.name, userId: user.id });
  } catch (err) {
    console.error("Eroare la autentificare:", err);
    res.status(500).send("Eroare la procesarea autentificării.");
  }
});

// Endpoint pentru deconectare
app.post("/logout", (req, res) => {
  // Deconectarea este gestionată pe client prin ștergerea token-ului
  res.send("Utilizatorul a fost deconectat.");
});

// Endpoint pentru obținerea listei de utilizatori cu logo-ul echipei
app.get("/users", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = `
      SELECT 
        users.id, 
        users.name, 
        users.profilePic, 
        teams.logo 
      FROM users 
      LEFT JOIN teams ON users.team_name = teams.team_name
    `;
    const [rows] = await connection.query(query);
    await connection.end();

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea utilizatorilor:", err);
    res.status(500).send("Eroare la obținerea utilizatorilor.");
  }
});

app.get("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Preluare detalii utilizator
    const [userRows] = await connection.query(
      `SELECT users.id, users.name, users.email, users.goals, users.assists, users.team_name, users.profilePic, users.matches_played, users.cleansheets, users.season_name, teams.logo AS team_logo
             FROM users
             LEFT JOIN teams ON users.team_name = teams.team_name
             WHERE users.id = ?`,
      [userId]
    );

    // Preluare trofee
    const [trophiesRows] = await connection.query(
      `SELECT trophy_name, trophy_image 
             FROM trophies 
             WHERE user_id = ?`,
      [userId]
    );

    await connection.end();

    if (userRows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const user = {
      ...userRows[0],
      trophies: trophiesRows,
    };

    res.json(user);
  } catch (err) {
    console.error("Eroare la obținerea detaliilor utilizatorului:", err);
    res.status(500).send("Eroare la obținerea detaliilor utilizatorului.");
  }
});

// Endpoint pentru încărcarea pozei de profil
app.post(
  "/uploadProfilePic/:id",
  verifyToken, // Verifică token-ul
  upload.single("profilePic"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).send("Fișierul nu a fost încărcat.");
    }

    const userId = req.params.id;
    const profilePicPath = `/uploads/${req.file.filename}`;

    try {
      const connection = await mysql.createConnection(dbConfig);
      await connection.query("UPDATE users SET profilePic = ? WHERE id = ?", [
        profilePicPath || "default-profile.png",
        userId,
      ]);
      await connection.end();

      res.status(200).send("Poza de profil a fost actualizată cu succes.");
    } catch (err) {
      console.error("Eroare la actualizarea pozei de profil:", err);
      res.status(500).send("Eroare la actualizarea pozei de profil.");
    }
  }
);

// Servește fișierul users.html
app.get("/users.html", (req, res) => {
  res.sendFile(path.join(__dirname, "users.html"));
});

// Servește fișierul profile.html
app.get("/profile.html", (req, res) => {
  res.sendFile(path.join(__dirname, "profile.html"));
});

// Endpoint pentru căutarea jucătorilor
app.get("/searchPlayer", async (req, res) => {
  const name = req.query.name;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(
      "SELECT id, name FROM users WHERE name LIKE ?",
      [`%${name}%`]
    );
    await connection.end();

    res.json(rows); // Returnează și ID-ul jucătorului
  } catch (err) {
    console.error("Eroare la căutarea jucătorilor:", err);
    res.status(500).send("Eroare la căutarea jucătorilor.");
  }
});

// function verifyToken(req, res, next) {
//   const token = req.headers["authorization"];
//   if (!token) {
//     return res.status(403).json({ message: "Token-ul este necesar." });
//   }

//   jwt.verify(token, jwtSecret, (err, decoded) => {
//     if (err) {
//       return res.status(403).json({ message: "Token invalid." });
//     }
//     req.user = decoded;

//     // Verifică dacă utilizatorul este "Hakut"
//     if (req.user.name !== "Hakut") {
//       return res.status(403).json({
//         message:
//           "Acces interzis: doar utilizatorul Hakut poate accesa această resursă.",
//       });
//     }

//     next();
//   });
// }
app.get("/careerHistory/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(
      `SELECT career_history.team_name, career_history.matches_played, career_history.goals, career_history.assists, career_history.cleansheets, career_history.season_name, teams.logo AS team_logo
       FROM career_history
       LEFT JOIN teams ON career_history.team_name = teams.team_name
       WHERE career_history.user_id = ?
       ORDER BY career_history.id DESC`,
      [userId]
    );
    await connection.end();

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea istoricului carierei:", err);
    res.status(500).send("Eroare la obținerea istoricului carierei.");
  }
});

// Endpoint pentru actualizarea statisticilor, echipei și sezonului unui jucător
app.put("/updatePlayer/:name", async (req, res) => {
  const playerName = req.params.name;
  const { goals, assists, matchesPlayed, cleansheets, teamName, seasonName } =
    req.body;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obține ID-ul și datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, assists, matches_played, cleansheets, team_name, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals = userRows[0].goals;
    const currentAssists = userRows[0].assists;
    const currentMatchesPlayed = userRows[0].matches_played;
    const currentCleansheets = userRows[0].cleansheets;
    const currentTeamName = userRows[0].team_name;
    const currentSeasonName = userRows[0].season_name;

    // Pregătim interogarea pentru actualizarea jucătorului
    let query =
      "UPDATE users SET goals = ?, assists = ?, matches_played = ?, cleansheets = ?";
    const params = [
      currentGoals + goals,
      currentAssists + assists,
      currentMatchesPlayed + matchesPlayed,
      currentCleansheets + cleansheets,
    ];

    let changed = false; // Flag pentru a verifica dacă s-a schimbat echipa sau sezonul

    // Verificăm dacă echipa s-a schimbat
    if (teamName !== undefined && teamName !== currentTeamName) {
      query += ", team_name = ?";
      params.push(teamName);
      changed = true;
    }

    // Verificăm dacă sezonul s-a schimbat
    if (seasonName !== undefined && seasonName !== currentSeasonName) {
      query += ", season_name = ?";
      params.push(seasonName);
      changed = true;
    }

    query += " WHERE id = ?"; // Filtrăm după ID-ul jucătorului
    params.push(userId); // Adăugăm ID-ul în parametrii interogării

    await connection.query(query, params);

    // Dacă echipa sau sezonul s-au schimbat, adaugă o nouă intrare în istoricul carierei
    if (changed) {
      await connection.query(
        "INSERT INTO career_history (user_id, team_name, goals, assists, matches_played, cleansheets, season_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          userId,
          currentTeamName,
          currentGoals,
          currentAssists,
          currentMatchesPlayed,
          currentCleansheets,
          currentSeasonName,
        ]
      );

      // Resetăm statisticile jucătorului
      await connection.query(
        "UPDATE users SET goals = ?, assists = ?, matches_played = ?, cleansheets = ? WHERE id = ?",
        [0, 0, 0, 0, userId] // Resetăm toate statisticile la zero
      );
    }

    await connection.end();
    res.status(200).send("Statistici, echipă și sezon actualizate cu succes.");
  } catch (err) {
    console.error(
      "Eroare la actualizarea statisticilor, echipei sau sezonului:",
      err
    );
    res
      .status(500)
      .send("Eroare la actualizarea statisticilor, echipei sau sezonului.");
  }
});

// Endpoint pentru obținerea detaliilor unui jucător
app.get("/playerDetails/:name", async (req, res) => {
  const playerName = req.params.name;

  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(
      "SELECT id, name, goals, assists, team_name, profilePic FROM users WHERE name = ?",
      [playerName]
    );
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("Eroare la obținerea detaliilor jucătorului:", err);
    res.status(500).send("Eroare la obținerea detaliilor jucătorului.");
  }
});

// Endpoint pentru obținerea statisticilor all-time ale jucătorului
app.get("/allTimeStats/:name", async (req, res) => {
  const playerName = req.params.name;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, assists, matches_played, cleansheets FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals = userRows[0].goals;
    const currentAssists = userRows[0].assists;
    const currentMatchesPlayed = userRows[0].matches_played;
    const currentCleansheets = userRows[0].cleansheets;

    // Obține statisticile din istoricul carierei
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) as totalGoals, SUM(assists) as totalAssists, SUM(matches_played) as totalMatchesPlayed, SUM(cleansheets) as totalCleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    await connection.end();

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;
    const historyAssists = careerHistoryRows[0].totalAssists
      ? parseInt(careerHistoryRows[0].totalAssists)
      : 0;
    const historyMatchesPlayed = careerHistoryRows[0].totalMatchesPlayed
      ? parseInt(careerHistoryRows[0].totalMatchesPlayed)
      : 0;
    const historyCleansheets = careerHistoryRows[0].totalCleansheets
      ? parseInt(careerHistoryRows[0].totalCleansheets)
      : 0;

    // Calculează totalul statisticilor
    const totalGoals = currentGoals + historyGoals;
    const totalAssists = currentAssists + historyAssists;
    const totalMatchesPlayed = currentMatchesPlayed + historyMatchesPlayed;
    const totalCleansheets = currentCleansheets + historyCleansheets;

    res.json({
      totalGoals,
      totalAssists,
      totalMatchesPlayed,
      totalCleansheets,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor all-time:", err);
    res.status(500).send("Eroare la obținerea statisticilor all-time.");
  }
});

// Endpoint pentru obținerea echipelor
app.get("/teams", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [teams] = await connection.query("SELECT team_name FROM teams");
    await connection.end();
    res.json(teams);
  } catch (err) {
    console.error("Eroare la obținerea echipelor:", err);
    res.status(500).send("Eroare la obținerea echipelor.");
  }
});

app.get("/seasons", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query("SELECT season_name FROM seasons");
    await connection.end();
    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea sezoanelor:", err);
    res.status(500).send("Eroare la obținerea sezoanelor.");
  }
});

app.get("/myProfile", verifyToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obține informațiile de bază despre utilizator
    const [userRows] = await connection.query(
      "SELECT id, name, email, goals, assists, matches_played, cleansheets, team_name, profilePic FROM users WHERE id = ?",
      [userId]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userProfile = userRows[0];

    // Obține statisticile din istoricul carierei
    const [careerStatsRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals, SUM(assists) AS totalAssists, SUM(matches_played) AS totalMatchesPlayed, SUM(cleansheets) AS totalCleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    // Obține istoricul carierei
    const [careerHistoryRows] = await connection.query(
      "SELECT team_name, goals, assists, matches_played, cleansheets FROM career_history WHERE user_id = ?",
      [userId]
    );

    await connection.end();

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const totalGoals =
      (userProfile.goals || 0) + (careerStatsRows[0].totalGoals || 0);
    const totalAssists =
      (userProfile.assists || 0) + (careerStatsRows[0].totalAssists || 0);
    const totalMatchesPlayed =
      (userProfile.matches_played || 0) +
      (careerStatsRows[0].totalMatchesPlayed || 0);
    const totalCleansheets =
      (userProfile.cleansheets || 0) +
      (careerStatsRows[0].totalCleansheets || 0);

    // Construiește obiectul de răspuns
    const response = {
      ...userProfile,
      totalGoals,
      totalAssists,
      totalMatchesPlayed,
      totalCleansheets,
      careerHistory: careerHistoryRows,
    };

    res.json(response);
  } catch (err) {
    console.error("Eroare la obținerea profilului utilizatorului:", err);
    res.status(500).send("Eroare la obținerea profilului utilizatorului.");
  }
});

app.get("/season1Stats/:name", async (req, res) => {
  const playerName = req.params.name;

  try {
    const connection = await mysql.createConnection(dbConfig);

    // Obține datele curente ale jucătorului
    const [userRows] = await connection.query(
      "SELECT id, goals, season_name FROM users WHERE name = ?",
      [playerName]
    );

    if (userRows.length === 0) {
      await connection.end();
      return res.status(404).send("Utilizatorul nu a fost găsit.");
    }

    const userId = userRows[0].id;
    const currentGoals =
      userRows[0].season_name === "Season 1" ? userRows[0].goals : 0;

    // Obține statisticile din istoricul carierei pentru sezonul 1
    const [careerHistoryRows] = await connection.query(
      "SELECT SUM(goals) AS totalGoals FROM career_history WHERE user_id = ? AND season_name = 'Season 1'",
      [userId]
    );

    await connection.end();

    // Asigură-te că valorile sunt 0 dacă nu există înregistrări
    const historyGoals = careerHistoryRows[0].totalGoals
      ? parseInt(careerHistoryRows[0].totalGoals)
      : 0;

    // Calculează totalul statisticilor pentru sezonul 1
    const totalGoals = currentGoals + historyGoals;

    res.json({
      totalGoals,
    });
  } catch (err) {
    console.error("Eroare la obținerea statisticilor din sezonul 1:", err);
    res.status(500).send("Eroare la obținerea statisticilor din sezonul 1.");
  }
});

app.get("/season1Statistics", async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.query(`
      SELECT users.name, 
             COALESCE(SUM(CASE WHEN career_history.season_name = 'Season 1' THEN career_history.goals END), 0) +
             COALESCE(CASE WHEN users.season_name = 'Season 1' THEN users.goals ELSE 0 END, 0) AS totalGoals
      FROM users
      LEFT JOIN career_history ON users.id = career_history.user_id
      GROUP BY users.name
      HAVING totalGoals > 0
    `);
    await connection.end();

    res.json(rows);
  } catch (err) {
    console.error("Eroare la obținerea statisticilor pentru sezonul 1:", err);
    res.status(500).send("Eroare la obținerea statisticilor pentru sezonul 1.");
  }
});

app.get("/statistics.html", (req, res) => {
  res.sendFile(path.join(__dirname, "statistics.html"));
});

// Pornire server
app.listen(port, "0.0.0.0", () => {
  console.log(`Serverul rulează pe http://localhost:${port}`);
});
