

const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { MongoClient } = require("mongodb");
const jwt = require("jsonwebtoken");

require("dotenv").config();

app.use(express.json());
app.use(cors());

const uri = process.env.MONGODB_URI; // Update with your MongoDB URI
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("users");
    const userCollection = db.collection("allUsers");
    const dbTwo = client.db("users");
    const paymentCollection = db.collection("paymentHistory");

   app.post("/user", async (req, res) => {
     const { name, email, password, imageUrl, role } = req.body;

     try {
       const user = await userCollection.findOne({ email });
       if (user) {
         return res.status(400).json({ message: "User already exists" });
       }

       //token create

      const token = jwt.sign(
        { email },
        process.env.JWT_SECRET, // Use an environment variable for the secret key
        { expiresIn: "1h" }
      );

      console.log(process.env.JWT_SECRET);
      console.log(token);

       // Respond with user data and token
       res.status(200).json({
         message: "Login successful",
         token
       });

       const hashedPassword = await bcrypt.hash(password, 10);

       const result = await userCollection.insertOne({
         name,
         token,
         role,
         email,
         imageUrl,
         password: hashedPassword,
         status: "Pending",
         RegiDate: new Date(),
       });

       res.send(result);
     } catch (error) {
       console.error("Error in user registration:", error);
       res.status(500).json({ message: "Failed to register user" });
     }
   });


    app.post("/loginUser", async (req, res) => {
      const { email, password } = req.body;

      try {
        const user = await userCollection.findOne({ email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = user.password; // Retrieve hashed password from database
        const isPasswordValid = await bcrypt.compare(password, hashedPassword);

        if (!isPasswordValid) {
          return res.status(401).json({ message: "Invalid credentials" });
        }

       


        res.status(200).json({ message: "Login successful" });
      } catch (error) {
        console.error("Error in login:", error);
        res.status(500).json({ message: "Failed to login" });
      }
    });

   app.get("/userInfo/:token", async (req, res) => {
     const { token } = req.params;
     console.log("tik tik tik" , token);
     const filter = { token: token };
     const item = await userCollection.findOne(filter);
     console.log(item);
     res.send(item);
   });

   app.post('/payment', async(req, res)=>{
    const item = req.body;
    const result = await paymentCollection.insertOne(item);
    res.send(result)
   })

  app.get("/payHistory/:token", async (req, res) => {
    try {
      const token = req.params.token; // Correctly extract the token
      console.log("Token:", token);

      const query = { token: token };
      const result = await paymentCollection.find(query).toArray();

      res.status(200).send(result);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send({ message: "An error occurred while fetching payment history." });
    }
  });




    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

connectToMongoDB();
