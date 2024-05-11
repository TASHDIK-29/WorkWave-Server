require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    // optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json());





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.iepmiic.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



// 

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const postCollections = client.db("WorkWave").collection("posts");
        const requestCollections = client.db("WorkWave").collection("requests");

        app.get('/post', async (req, res) => {
            const result = await postCollections.find().toArray();

            res.send(result);
        })

        app.post('/post', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await postCollections.insertOne(data);
            res.send(result);
        })


        // Request Apis

        app.get('/request', async (req, res) => {
            const result = await requestCollections.find().toArray();

            res.send(result);
        })

        app.post('/request', async (req, res) => {
            const data = req.body;
            console.log(data);
            const result = await requestCollections.insertOne(data);

            // Update Number of Volunteer
            const update = await postCollections.updateOne(
                {
                    postTitle: data.postTitle,
                    orgEmail: data.orgEmail,
                },
                { $inc: { noOfVolunteers: -1 } }
            )
            res.send({result, update});
        })

        app.delete('/request', async (req, res) => {
            const email = req.query.email;
            const id = req.query.id;
            // console.log(email, id);

            const query ={
                _id: new ObjectId(id),
                volunteerEmail: email
            }

            const result = await requestCollections.deleteOne(query);
            
            res.send(result);
        })

        // get single post by ID
        app.get('/post/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await postCollections.findOne(query);


            res.send(result);
        })

        // Delete single post by ID
        app.delete('/post/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await postCollections.deleteOne(query);


            res.send(result);
        })

        // Update single post by ID
        app.put('/post/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const updatedPost = req.body;

            const post={
                $set:{
                    deadline : updatedPost.deadline,
                    orgEmail : updatedPost.orgEmail,
                    orgName : updatedPost.orgName,
                    description : updatedPost.description,
                    location : updatedPost.location,
                    thumbnail : updatedPost.thumbnail,
                    noOfVolunteers : updatedPost.noOfVolunteers,
                    category : updatedPost.category,
                    postTitle : updatedPost.postTitle,
                }
            }

            const result = await postCollections.updateOne(query, post);
            res.send(result);
        })

        // get posts by Email
        app.get('/myPost/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(id);
            const query = { orgEmail : email }
            const result = await postCollections.find(query).toArray();


            res.send(result);
        })

        app.get('/myRequest/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(id);
            const query = { volunteerEmail : email }
            const result = await requestCollections.find(query).toArray();


            res.send(result);
        })




        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("WorkWave Server Is On!!");
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})