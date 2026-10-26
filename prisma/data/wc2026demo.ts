import type { SeedTournament } from "./types";

// ── 2026 World Cup — Demo Simulation ────────────────────────
// A clearly-labeled fictional tournament used for demo mode.
// India's squad uses real national-team players; results are
// simulated so the app can showcase an underdog "dream run"
// narrative end-to-end without external API dependencies.

export const wc2026demo: SeedTournament = {
  name: "World Cup 2026",
  year: 2026,
  country: "USA · Canada · Mexico",
  startDate: "2026-06-11",
  endDate: "2026-07-19",
  isDemo: true,
  teams: [
    {
      ref: "IND", name: "India", short: "IND", country: "India",
      flag: "🇮🇳", color: "#FF9933", group: "A",
      players: [
        { name: "Gurpreet Singh Sandhu", pos: "GK", no: 1, age: 34 },
        { name: "Akash Mishra", pos: "DF", no: 3, age: 24 },
        { name: "Sandesh Jhingan", pos: "DF", no: 5, age: 32 },
        { name: "Anwar Ali", pos: "DF", no: 4, age: 25 },
        { name: "Rahul Bheke", pos: "DF", no: 2, age: 35 },
        { name: "Suresh Singh Wangjam", pos: "MF", no: 8, age: 25 },
        { name: "Anirudh Thapa", pos: "MF", no: 7, age: 28 },
        { name: "Sahal Abdul Samad", pos: "MF", no: 18, age: 29 },
        { name: "Lallianzuala Chhangte", pos: "FW", no: 17, age: 29 },
        { name: "Sunil Chhetri", pos: "FW", no: 11, age: 41 },
        { name: "Manvir Singh", pos: "FW", no: 9, age: 30 },
        { name: "Liston Colaco", pos: "FW", no: 19, age: 27 },
        { name: "Vikram Partap Singh", pos: "FW", no: 21, age: 24 },
      ],
    },
    {
      ref: "JPN", name: "Japan", short: "JPN", country: "Japan",
      flag: "🇯🇵", color: "#000555", group: "A",
      players: [
        { name: "Zion Suzuki", pos: "GK", no: 1, age: 24 },
        { name: "Takehiro Tomiyasu", pos: "DF", no: 16, age: 27 },
        { name: "Ko Itakura", pos: "DF", no: 4, age: 29 },
        { name: "Hiroki Ito", pos: "DF", no: 21, age: 27 },
        { name: "Wataru Endo", pos: "MF", no: 6, age: 33 },
        { name: "Hidemasa Morita", pos: "MF", no: 5, age: 31 },
        { name: "Takefusa Kubo", pos: "MF", no: 11, age: 25 },
        { name: "Daichi Kamada", pos: "MF", no: 8, age: 30 },
        { name: "Kaoru Mitoma", pos: "FW", no: 15, age: 29 },
        { name: "Ayase Ueda", pos: "FW", no: 9, age: 27 },
      ],
    },
    {
      ref: "USA", name: "United States", short: "USA", country: "United States",
      flag: "🇺🇸", color: "#3C3B6E", group: "A",
      players: [
        { name: "Matt Turner", pos: "GK", no: 1, age: 32 },
        { name: "Sergiño Dest", pos: "DF", no: 2, age: 25 },
        { name: "Antonee Robinson", pos: "DF", no: 5, age: 28 },
        { name: "Chris Richards", pos: "DF", no: 3, age: 26 },
        { name: "Tyler Adams", pos: "MF", no: 4, age: 27 },
        { name: "Weston McKennie", pos: "MF", no: 8, age: 27 },
        { name: "Yunus Musah", pos: "MF", no: 6, age: 23 },
        { name: "Christian Pulisic", pos: "FW", no: 10, age: 27 },
        { name: "Folarin Balogun", pos: "FW", no: 9, age: 25 },
        { name: "Timothy Weah", pos: "FW", no: 11, age: 26 },
      ],
    },
    {
      ref: "NGA", name: "Nigeria", short: "NGA", country: "Nigeria",
      flag: "🇳🇬", color: "#008751", group: "A",
      players: [
        { name: "Stanley Nwabali", pos: "GK", no: 1, age: 30 },
        { name: "Ola Aina", pos: "DF", no: 2, age: 29 },
        { name: "William Troost-Ekong", pos: "DF", no: 5, age: 32 },
        { name: "Calvin Bassey", pos: "DF", no: 6, age: 26 },
        { name: "Wilfred Ndidi", pos: "MF", no: 4, age: 29 },
        { name: "Alex Iwobi", pos: "MF", no: 18, age: 30 },
        { name: "Victor Osimhen", pos: "FW", no: 9, age: 27 },
        { name: "Ademola Lookman", pos: "FW", no: 11, age: 28 },
        { name: "Samuel Chukwueze", pos: "FW", no: 7, age: 27 },
      ],
    },
    {
      ref: "FRA", name: "France", short: "FRA", country: "France",
      flag: "🇫🇷", color: "#0055A4", group: "B",
      players: [
        { name: "Mike Maignan", pos: "GK", no: 16, age: 30 },
        { name: "Jules Koundé", pos: "DF", no: 5, age: 27 },
        { name: "William Saliba", pos: "DF", no: 17, age: 25 },
        { name: "Dayot Upamecano", pos: "DF", no: 18, age: 27 },
        { name: "Théo Hernandez", pos: "DF", no: 22, age: 28 },
        { name: "Aurélien Tchouaméni", pos: "MF", no: 8, age: 26 },
        { name: "Eduardo Camavinga", pos: "MF", no: 6, age: 23 },
        { name: "Michael Olise", pos: "FW", no: 11, age: 24 },
        { name: "Kylian Mbappé", pos: "FW", no: 10, age: 27 },
        { name: "Marcus Thuram", pos: "FW", no: 26, age: 28 },
        { name: "Bradley Barcola", pos: "FW", no: 20, age: 23 },
      ],
    },
    {
      ref: "BRA", name: "Brazil", short: "BRA", country: "Brazil",
      flag: "🇧🇷", color: "#009739", group: "B",
      players: [
        { name: "Alisson Becker", pos: "GK", no: 1, age: 33 },
        { name: "Wesley", pos: "DF", no: 2, age: 22 },
        { name: "Marquinhos", pos: "DF", no: 4, age: 32 },
        { name: "Gabriel Magalhães", pos: "DF", no: 3, age: 28 },
        { name: "Casemiro", pos: "MF", no: 5, age: 34 },
        { name: "Bruno Guimarães", pos: "MF", no: 8, age: 28 },
        { name: "Lucas Paquetá", pos: "MF", no: 7, age: 28 },
        { name: "Vinícius Júnior", pos: "FW", no: 20, age: 26 },
        { name: "Rodrygo", pos: "FW", no: 10, age: 25 },
        { name: "Estêvão", pos: "FW", no: 11, age: 19 },
        { name: "Endrick", pos: "FW", no: 9, age: 20 },
      ],
    },
    {
      ref: "GER", name: "Germany", short: "GER", country: "Germany",
      flag: "🇩🇪", color: "#000000", group: "B",
      players: [
        { name: "Marc-André ter Stegen", pos: "GK", no: 1, age: 34 },
        { name: "Joshua Kimmich", pos: "DF", no: 6, age: 31 },
        { name: "Antonio Rüdiger", pos: "DF", no: 2, age: 33 },
        { name: "Nico Schlotterbeck", pos: "DF", no: 4, age: 26 },
        { name: "Jamal Musiala", pos: "MF", no: 10, age: 23 },
        { name: "Florian Wirtz", pos: "MF", no: 17, age: 23 },
        { name: "Ilkay Gündoğan", pos: "MF", no: 21, age: 35 },
        { name: "Kai Havertz", pos: "FW", no: 7, age: 27 },
        { name: "Niclas Füllkrug", pos: "FW", no: 9, age: 33 },
        { name: "Leroy Sané", pos: "FW", no: 19, age: 30 },
      ],
    },
    {
      ref: "MAR", name: "Morocco", short: "MAR", country: "Morocco",
      flag: "🇲🇦", color: "#C1272D", group: "B",
      players: [
        { name: "Yassine Bounou", pos: "GK", no: 1, age: 35 },
        { name: "Achraf Hakimi", pos: "DF", no: 2, age: 27 },
        { name: "Nayef Aguerd", pos: "DF", no: 5, age: 30 },
        { name: "Noussair Mazraoui", pos: "DF", no: 3, age: 28 },
        { name: "Sofyan Amrabat", pos: "MF", no: 4, age: 29 },
        { name: "Azzedine Ounahi", pos: "MF", no: 8, age: 26 },
        { name: "Brahim Díaz", pos: "FW", no: 10, age: 27 },
        { name: "Youssef En-Nesyri", pos: "FW", no: 19, age: 29 },
        { name: "Abde Ezzalzouli", pos: "FW", no: 17, age: 24 },
      ],
    },
  ],
  matches: [
    // ── Group A: IND, JPN, USA, NGA ──
    {
      home: "IND", away: "NGA", h: 1, a: 1, date: "2026-06-12", venue: "MetLife Stadium",
      stage: "GROUP", group: "A",
      events: [
        { min: 24, type: "GOAL", team: "NGA", player: "Victor Osimhen", detail: "Header" },
        { min: 78, type: "GOAL", team: "IND", player: "Manvir Singh", description: "Manvir heads home India's first-ever World Cup goal" },
      ],
    },
    {
      home: "JPN", away: "USA", h: 2, a: 1, date: "2026-06-12", venue: "SoFi Stadium",
      stage: "GROUP", group: "A",
      events: [
        { min: 33, type: "GOAL", team: "JPN", player: "Kaoru Mitoma" },
        { min: 55, type: "GOAL", team: "USA", player: "Christian Pulisic" },
        { min: 71, type: "GOAL", team: "JPN", player: "Ayase Ueda" },
      ],
    },
    {
      home: "IND", away: "JPN", h: 0, a: 2, date: "2026-06-17", venue: "AT&T Stadium",
      stage: "GROUP", group: "A",
      events: [
        { min: 19, type: "GOAL", team: "JPN", player: "Takefusa Kubo", detail: "Curled shot" },
        { min: 64, type: "GOAL", team: "JPN", player: "Kaoru Mitoma" },
        { min: 88, type: "RED_CARD", team: "IND", player: "Sandesh Jhingan", description: "Jhingan sent off for a last-man foul" },
      ],
    },
    {
      home: "USA", away: "NGA", h: 1, a: 0, date: "2026-06-17", venue: "MetLife Stadium",
      stage: "GROUP", group: "A",
      events: [{ min: 59, type: "GOAL", team: "USA", player: "Folarin Balogun" }],
    },
    {
      home: "IND", away: "USA", h: 2, a: 1, date: "2026-06-23", venue: "Azteca Stadium",
      stage: "GROUP", group: "A",
      events: [
        { min: 14, type: "GOAL", team: "USA", player: "Christian Pulisic", detail: "Free kick" },
        { min: 41, type: "GOAL", team: "IND", player: "Lallianzuala Chhangte", description: "Chhangte levels on the counter — the stadium erupts" },
        { min: 89, type: "GOAL", team: "IND", player: "Sunil Chhetri", description: "The 41-year-old captain scores an 89th-minute winner to send India through" },
      ],
    },
    {
      home: "NGA", away: "JPN", h: 1, a: 1, date: "2026-06-23", venue: "SoFi Stadium",
      stage: "GROUP", group: "A",
      events: [
        { min: 50, type: "GOAL", team: "JPN", player: "Ayase Ueda" },
        { min: 82, type: "GOAL", team: "NGA", player: "Ademola Lookman" },
      ],
    },
    // ── Group B: FRA, BRA, GER, MAR ──
    {
      home: "FRA", away: "GER", h: 2, a: 0, date: "2026-06-13", venue: "MetLife Stadium",
      stage: "GROUP", group: "B",
      events: [
        { min: 28, type: "GOAL", team: "FRA", player: "Kylian Mbappé" },
        { min: 66, type: "GOAL", team: "FRA", player: "Michael Olise" },
      ],
    },
    {
      home: "BRA", away: "MAR", h: 1, a: 1, date: "2026-06-13", venue: "AT&T Stadium",
      stage: "GROUP", group: "B",
      events: [
        { min: 37, type: "GOAL", team: "BRA", player: "Vinícius Júnior" },
        { min: 75, type: "GOAL", team: "MAR", player: "Brahim Díaz" },
      ],
    },
    {
      home: "FRA", away: "BRA", h: 1, a: 0, date: "2026-06-18", venue: "SoFi Stadium",
      stage: "GROUP", group: "B",
      events: [{ min: 84, type: "GOAL", team: "FRA", player: "Marcus Thuram", description: "Thuram heads a late winner in a heavyweight clash" }],
    },
    {
      home: "GER", away: "MAR", h: 2, a: 1, date: "2026-06-18", venue: "MetLife Stadium",
      stage: "GROUP", group: "B",
      events: [
        { min: 11, type: "GOAL", team: "GER", player: "Florian Wirtz" },
        { min: 49, type: "GOAL", team: "MAR", player: "Youssef En-Nesyri" },
        { min: 72, type: "GOAL", team: "GER", player: "Jamal Musiala" },
      ],
    },
    {
      home: "GER", away: "BRA", h: 0, a: 3, date: "2026-06-24", venue: "Azteca Stadium",
      stage: "GROUP", group: "B",
      events: [
        { min: 22, type: "GOAL", team: "BRA", player: "Estêvão", description: "19-year-old Estêvão announces himself on the world stage" },
        { min: 58, type: "GOAL", team: "BRA", player: "Vinícius Júnior" },
        { min: 77, type: "GOAL", team: "BRA", player: "Endrick" },
      ],
    },
    {
      home: "MAR", away: "FRA", h: 0, a: 2, date: "2026-06-24", venue: "AT&T Stadium",
      stage: "GROUP", group: "B",
      events: [
        { min: 39, type: "GOAL", team: "FRA", player: "Kylian Mbappé" },
        { min: 90, type: "GOAL", team: "FRA", player: "Bradley Barcola" },
      ],
    },
    // ── Semi-finals ──
    {
      home: "FRA", away: "JPN", h: 3, a: 1, date: "2026-07-14", venue: "MetLife Stadium",
      stage: "SEMI_FINAL",
      events: [
        { min: 9, type: "GOAL", team: "FRA", player: "Kylian Mbappé" },
        { min: 44, type: "GOAL", team: "JPN", player: "Takefusa Kubo" },
        { min: 61, type: "GOAL", team: "FRA", player: "Kylian Mbappé" },
        { min: 86, type: "GOAL", team: "FRA", player: "Michael Olise" },
      ],
    },
    {
      home: "BRA", away: "IND", h: 1, a: 2, date: "2026-07-15", venue: "SoFi Stadium",
      stage: "SEMI_FINAL",
      events: [
        { min: 31, type: "GOAL", team: "BRA", player: "Vinícius Júnior", description: "Vinícius opens the scoring — India's dream looks over" },
        { min: 67, type: "GOAL", team: "IND", player: "Liston Colaco", description: "Colaco smashes in the equalizer against all odds" },
        { min: 90, type: "GOAL", team: "IND", player: "Sunil Chhetri", extraMinute: 4, description: "94th minute. Chhetri. India are going to a World Cup final" },
      ],
    },
    // ── Third place ──
    {
      home: "JPN", away: "BRA", h: 0, a: 2, date: "2026-07-18", venue: "AT&T Stadium",
      stage: "THIRD_PLACE",
      events: [
        { min: 40, type: "GOAL", team: "BRA", player: "Rodrygo" },
        { min: 70, type: "GOAL", team: "BRA", player: "Estêvão" },
      ],
    },
    // ── Final ──
    {
      home: "FRA", away: "IND", h: 2, a: 0, date: "2026-07-19", venue: "MetLife Stadium",
      stage: "FINAL",
      events: [
        { min: 24, type: "GOAL", team: "FRA", player: "Kylian Mbappé", detail: "Counter-attack" },
        { min: 63, type: "GOAL", team: "FRA", player: "Marcus Thuram", detail: "Header" },
        { min: 90, type: "MILESTONE", team: "IND", description: "India's first World Cup ends as runners-up — a campaign that captivated a billion people" },
      ],
    },
  ],
};
