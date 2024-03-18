const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jsonMiddleware = express.json();
app.use(jsonMiddleware);
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

let db = null;
const dbPath = path.join(__dirname, "./covid19IndiaPortal.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("App Running");
    });
  } catch (error) {
    console.log(`DB error : ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "dfhbvjasdjnkas", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};
// zero api

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username= '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "dfhbvjasdjnkas");
      console.log(jwtToken);
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
// first api
app.get("/states/", authenticateToken, async (req, res) => {
  const query = `SELECT * FROM state`;
  const queryResult = await db.all(query);

  const ans = (queryResult) => {
    return {
      stateId: queryResult.state_id,
      stateName: queryResult.state_name,
      population: queryResult.population,
    };
  };
  res.send(queryResult.map((eachState) => ans(eachState)));
});

// second api
app.get("/states/:stateId/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const query = `SELECT * FROM state WHERE state_id = ${stateId}`;
  const queryResult = await db.get(query);
  const newResponse = {
    stateId: queryResult.state_id,
    stateName: queryResult.state_name,
    population: queryResult.population,
  };

  res.send(newResponse);
});

// third api
app.post("/districts/", authenticateToken, async (req, res) => {
  const districtDetails = req.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const query = `
    INSERT INTO district(district_name,state_id,cases,cured,active,deaths)
    VALUES ('${districtName}',${stateId},${cases},${cured},${active},${deaths});
    `;
  const queryResult = await db.run(query);
  res.send("District Successfully Added");
});

// fourth api
app.get("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const query = `SELECT * FROM district WHERE district_id = ${districtId}`;
  const queryResult = await db.get(query);
  const ans = {
    districtId: queryResult.district_id,
    districtName: queryResult.district_name,
    stateId: queryResult.state_id,
    cases: queryResult.cases,
    cured: queryResult.cured,
    active: queryResult.active,
    deaths: queryResult.deaths,
  };
  res.send(ans);
});

// fifth api
app.delete("/districts/:districtId/", authenticateToken, async (req, res) => {
  const { districtId } = req.params;
  const query = `DELETE FROM district WHERE district_id = ${districtId}`;
  const queryResult = await db.run(query);
  res.send("District Removed");
});

// sixth api

app.put("/districts/:districtId/", authenticateToken, async (req, res) => {
  const districtDetails = req.body;
  const { districtId } = req.params;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const query = `
    UPDATE district
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}

    WHERE district_id = ${districtId};

    `;
  const queryResult = await db.run(query);
  res.send("District Details Updated");
});

// seventh api
app.get("/states/:stateId/stats/", authenticateToken, async (req, res) => {
  const { stateId } = req.params;
  const query = `SELECT * FROM district WHERE state_id = ${stateId}`;
  const queryResult = await db.all(query);
  let totalCases = 0;
  let totalCured = 0;
  let totalActive = 0;
  let totalDeaths = 0;

  for (const item of queryResult) {
    (totalCases += item.cases),
      (totalCured += item.cured),
      (totalActive += item.active),
      (totalDeaths += item.deaths);
  }
  let final_result = {
    totalCases: totalCases,
    totalCured: totalCured,
    totalActive: totalActive,
    totalDeaths: totalDeaths,
  };
  res.send(final_result);
});

// eighth api
app.get(
  "/districts/:districtId/details/",
  authenticateToken,
  async (req, res) => {
    const { districtId } = req.params;
    const district = `SELECT * FROM district WHERE district_id = ${districtId}`;
    const districtDetails = await db.get(district);
    const { state_id } = districtDetails;
    const stateQuery = `SELECT state_name FROM state WHERE state_id = ${state_id}`;
    const state = await db.get(stateQuery);
    const ans = {
      stateName: state.state_name,
    };
    res.send(ans);
  }
);
module.exports = app;
// module.exports = express;
