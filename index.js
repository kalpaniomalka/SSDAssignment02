const express = require("express");
const fs = require("fs");
const multer = require("multer");
const credentials = require("./client_secret.json");
const { google } = require("googleapis");

const app = express();

const CLIENT_ID = credentials.web.client_id;
const CLIENT_SECRET = credentials.web.client_secret;
const REDIRECT_URL = credentials.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID,CLIENT_SECRET,REDIRECT_URL);

const SCOPES =
  "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/drive.file";

let authStatus = false;
let userName;

app.set("view engine", "ejs");

let Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, "./images");
  },
  filename: function (req, file, callback) {
    callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});

let upload = multer({
  storage: Storage,
}).single("file");

app.get("/", (req, res) => {
  if (!authStatus) {
    var url = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES,
    });
    console.log(url);
    res.render("index", { url: url });
  } else {
    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        console.log(response.data);
        name = response.data.name
        res.render("upload", {
          userName: response.data.name,
          success:false
        });
      }
    });
  }
});

app.get("/login", function (req, res) {
    const code = req.query.code;
    if (code) {
      oAuth2Client.getToken(code, function (err, tokens) {
        if (err) {
          console.log(err);
        } else {
          console.log("Success!");
          console.log(tokens)
          oAuth2Client.setCredentials(tokens);
  
          authStatus = true;
          res.redirect("/");
        }
      });
    }
  });

app.post("/upload", (req, res) => {
  upload(req, res, function (err) {
    if (err) {
      return res.end(err);
    } else {
      const drive = google.drive({ version: "v3",auth:oAuth2Client  });
      const fileMetadata = {
        name: req.file.filename,
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
      drive.files.create(
        {
          resource: fileMetadata,
          media: media,
          fields: "id",
        },
        (err, file) => {
          if (err) {
            console.error(err);
          } else {
            fs.unlinkSync(req.file.path)
            res.render("upload",{name:userName,success:true})
          }

        }
      );
    }
  });
});

app.get('/logout',(req,res) => {
    authStatus = false
    res.redirect('/')
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server Started on ${PORT}`));
