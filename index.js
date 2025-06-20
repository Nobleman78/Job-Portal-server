const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser');
const app = express();
require('dotenv').config();



const port = process.env.PORT || 3000

/*Middle-War*/
app.use(cors({
  origin: ['https://job-portal-client-rosy.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  console.log(req.cookies)
  console.log('Token inside the verifyToken', token);
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized Access' });
    }
    req.user = decoded; // Attach decoded token to request
    next();
  });
};

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oyt4s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    //await client.connect();
    // Making the collection in the db
    const database = client.db('jobsPortal')
    const jobCollection = database.collection('jobs')
    const jobApplication = database.collection('job_applications')
    const popularJobs = database.collection('popular-jobs')
    const TopCompanies = database.collection('top-companies')
    const AllCompanies = database.collection('All_Companies')
    const bookMarks = database.collection('bookmarksCollection')
    const RolesBasedJobCollection = database.collection('Roles')
    const SponsorCompany = database.collection('Sponsor-company')

    //  Authentication Related API
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1d' })
      res.cookie(
        'token', token, {
        httpOnly: true,
        secure: false,

      })
      res.send({ success: true })
    })
    app.post('/logout', async (req, res) => {
      res.clearCookie('token', {
        httpOnly: true,
        secure: false
      })
      res.send({ success: true })
    })
    // Popular Jobs
    app.get('/popular-jobs', async (req, res) => {
      const result = await popularJobs.find().toArray()
      res.send(result);
    })

    app.get('/jobs', async (req, res) => {
      const cursor = jobCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobCollection.findOne(query)
      res.send(result)
    })

    /* -------Feature Company And Top Company--------- */
    //Top Companies Job
    app.get('/top-companies', async (req, res) => {
      const cursor = TopCompanies.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    // All companies Job
    app.get('/companies', async (req, res) => {
      const cursor = await AllCompanies.find().toArray()
      res.send(cursor)
    })


    // Job Application Apis
    app.get('/job-application', verifyToken, async (req, res) => {

      const email = req.user?.email;
      if (!email) {
        return res.status(400).send({ message: 'Email not found in token' });
      }
      const query = { applicant_email: email };
      const result = await jobApplication.find(query).toArray();
      // res.send(result);
      const symbol = '$';
      for (const application of result) {
        console.log(application.job_id)
        const queryOne = { _id: new ObjectId(application.job_id) }
        const job = await jobCollection.findOne(queryOne)
        if (job) {
          application.title = job.title
          application.location = job.location
          application.company = job.company
          application.company_logo = job.company_logo
          application.salaryRange = job.salaryRange

        }
      }
      res.send(result)

    });
    app.post('/job-applications', async (req, res) => {
      const application = req.body;
      const result = await jobApplication.insertOne(application);
      res.send(result)

    })

    app.delete('/job-application/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await jobApplication.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error('Error deleting job application:', error);
        res.status(500).send({ message: 'Failed to delete job application' });
      }
    });

    // Bookmark API
    
    app.post('/bookmarks', async (req, res) => {
      const { jobId, title, salaryRange, location, company_logo, userEmail } = req.body;
      if (!userEmail) {
        return res.send({ message: 'User email is required' });
      }

      const result = await bookMarks.insertOne({
        jobId,
        userEmail,
        title,
        salaryRange,
        location,
        company_logo,
        createdAt: new Date()
      });

      res.send({
        bookmarkId: result.insertedId
      });

    });

    //  Get Book Mark Jobs

    app.get('/bookmarks', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!email) {
        return res.status(400).send({ message: 'Email parameter is required' });
      }
      const bookmarks = await bookMarks.find({ userEmail: email }).toArray();
      res.send(bookmarks);

    });

    // Roles Based Job Collection
    app.get('/rolebasedjob',async(req,res)=>{
      const query = await RolesBasedJobCollection.find().toArray()
      res.send(query)
    })

    // Sponsor Company
    app.get('/sponsor-company-jobs', async(req,res)=>{
      const query = await SponsorCompany.find().toArray()
      res.send(query)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('All Jobs Is Here')
})
app.listen(port, () => {
  console.log(`Job will be found at port :  ${port}`)
})