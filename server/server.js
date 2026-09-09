const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req,res) => {
  res.send("Hello, Express server is running")
});

app.post("/api/mtn/callback", (req,res) => {
    console.log("MTN callback",req.body)
    res.sendStatus(200)
})

app.listen(PORT, () => console.log(`Connected successfully, running on ${PORT}`))