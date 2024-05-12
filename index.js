require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
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
app.use(cookieParser());




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


// custom Middleware

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('Token from verify section : ', token);
    if (!token) {
        return res.status(401).send({ massage: 'Not Authorized' })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ massage: 'Not Authorized' });
        }
        console.log('value in the token', decoded);
        req.user = decoded;
        next();
    })

}



const cookieOption = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
};

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const postCollections = client.db("WorkWave").collection("posts");
        const requestCollections = client.db("WorkWave").collection("requests");
        const reviewCollections = client.db("WorkWave").collection("reviews");


        // JWT Generate
        app.post('/jwt', async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1d' });

            res.cookie('token', token, cookieOption).send({ success: true });
        })

        // Clear cookie when Logout
        app.get('/logout', async (req, res) => {
            // const user = req.body;
            // console.log('logout user :', user);
            res.clearCookie('token', { ...cookieOption, maxAge: 0 }).send({ success: true });
        })



        // Post

        app.get('/post', async (req, res) => {
            const search = req.query.search;
            console.log('from search', search);

            let result;

            if (search) {
                const query = { postTitle: { $regex: search, $options: 'i' } };
                result = await postCollections.find(query).toArray();
            }
            else {
                result = await postCollections.find().toArray();
            }

            res.send(result);
        })

        // get limited data with sorting
        app.get('/sortedPost', async (req, res) => {
            const result = await postCollections.find().sort({ deadline: 1 }).limit(6).toArray();

            res.send(result);
        })

        // get limited data of most viewed
        app.get('/mostViewed', async (req, res) => {
            const result = await postCollections.find().sort({ view: -1 }).limit(6).toArray();

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
            res.send({ result, update });
        })

        app.delete('/request', async (req, res) => {
            const email = req.query.email;
            const id = req.query.id;
            // console.log(email, id);

            const query = {
                _id: new ObjectId(id),
                volunteerEmail: email
            }

            const result = await requestCollections.deleteOne(query);

            res.send(result);
        })


        // // Update Number of Volunteer
        // const update = await postCollections.updateOne(
        //     {
        //         postTitle: data.postTitle,
        //         orgEmail: data.orgEmail,
        //     },
        //     { $inc: { noOfVolunteers: -1 } }
        // )

        // get single post by ID
        app.get('/post/:id', async (req, res) => {
            const id = req.params.id;
            const view = req.query.view;
            // console.log(id);
            const query = { _id: new ObjectId(id) }


            if (!view) {
                const update = await postCollections.updateOne(query, { $inc: { view: +1 } })
            }

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

            const post = {
                $set: {
                    deadline: updatedPost.deadline,
                    orgEmail: updatedPost.orgEmail,
                    orgName: updatedPost.orgName,
                    description: updatedPost.description,
                    location: updatedPost.location,
                    thumbnail: updatedPost.thumbnail,
                    noOfVolunteers: updatedPost.noOfVolunteers,
                    category: updatedPost.category,
                    postTitle: updatedPost.postTitle,
                }
            }

            const result = await postCollections.updateOne(query, post);
            res.send(result);
        })

        // get posts by Email
        app.get('/myPost/:email', verifyToken, async (req, res) => {
            // const token = req.cookies.token;
            // console.log('Token Here', token);

            const email = req.params.email;

            console.log('From api', req.user.email);
            console.log('From api 2', email);

            // if(email !== req.user.email){
            //     return res.status(403).send({massage : 'Forbidden Access'})
            // }


            const query = { orgEmail: email }
            const result = await postCollections.find(query).toArray();

            res.send(result);
        })

        app.get('/myRequest/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(id);
            const query = { volunteerEmail: email }
            const result = await requestCollections.find(query).toArray();


            res.send(result);
        })


        // Review 

        app.post('/review', async (req, res) => {
            const review = req.body;

            review.createdAt = new Date();

            // console.log('from server',review);

            const result = await reviewCollections.insertOne(review);
            res.send(result);
        })

        app.get('/review', async (req, res) => {
            const result = await reviewCollections.find().sort({ createdAt: -1 }).toArray();

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