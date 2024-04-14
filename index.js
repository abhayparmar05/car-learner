const { PrismaClient } = require("@prisma/client");
const express = require("express");
const app = express();
const fs = require("fs");
const prisma = new PrismaClient();
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const bcrypt = require("bcryptjs");
app.use(express.json());
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { auth } = require("./middleware/auth.middleware");

//register owner
app.post("/owner/register", async (req, res) => {
  try {
    const { name, email, password, number } = req.body;

    const existingUser = await prisma.owner.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.owner.create({
      data: {
        name,
        email,
        password: hashedPassword,
        number,
      },
      include: { school: true },
    });

    const token = jwt.sign({ user: newUser }, process.env.JWT_SECRET);
    res.json({ token, newUser }).status(200);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Error registering user" });
  }
});
//create school
app.post("/owner/schoolDetail", auth, async (req, res) => {
  try {
    const { name, address, conNumber, pincode, stateId, cityId, ownerId } =
      req.body;
    const newSchool = await prisma.school.create({
      data: {
        name,
        address,
        conNumber,
        stateId,
        cityId,
        ownerId,
        pincode,
      },
    });

    res.status(201).json(newSchool);
  } catch (error) {
    console.error("Error creating school:", error);
    res.status(500).json({ error: "Error creating school" });
  }
});
//school image upload
app.post(
  "/owner/schoolImage",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      // Get the uploaded file path
      const imagePath = req.file.path;

      // Save the image metadata to the database
      const image = await prisma.school_image.create({
        data: {
          filename: req.file.originalname,
          filepath: imagePath,
          schoolId: req.body,
        },
      });
      res.json({ success: true, image });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ success: false, error: "Error uploading image" });
    }
  }
);
//login owner
app.post("/owner/login", async (req, res) => {
  try {
    const { name, password } = req.body;
    // Find the user with the provided username
    const user = await prisma.owner.findFirst({
      where: { AND: [{ name }] },
      include: { school: true },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign({ user: user }, process.env.JWT_SECRET);
    res.json({ token, user }).status(200);
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Error logging in" });
  }
});

//get owner profile
app.get("/owner/profile/:id", auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const ownerDetail = await prisma.owner.findFirst({ where: { id } });
    res.status(200).json(ownerDetail);
  } catch (error) {
    console.error("errro", error);
    res.status(404).json(error);
  }
});
// add cariculam
app.post("/curriculm", auth, async (req, res) => {
  const { day, price, tasks, carId, carprice, schoolId } = req.body;
  try {
    const AddCourse = await prisma.course.create({
      data: { day, price, schoolId },
      include: { curriculum: true, selected_vehical: true },
    });
    for (const taskData of tasks) {
      try {
        // Inserting a task into the database
        await prisma.curriculum.create({
          data: {
            title: taskData.title,
            days: taskData.days,
            courseId: AddCourse.id,
          },
        });
      } catch (error) {
        console.error(`Error inserting task "${taskData.title}":`, error);
      }

    }
    const selected_vehical = await prisma.selected_vehical.create({
      data: { courseId: AddCourse.id, price:carprice, vehicalID: carId },
    });
    res.send({ AddCourse, tasks, selected_vehical });
  } catch (e) {
    console.log(e);
  }
});
//get cariculam
app.get('/getcurriculm',auth,async(req,res)=>{
  try{
    const curriculms = await prisma.selected_vehical.findMany({include:{course:true}})
  res.send(curriculms).status(200)
  }catch(e){
    console.log(e)
    res.send("error").status(500)
  }
})
//add Owner Expense
app.post("/owner/expense", auth, async (req, res) => {
  try {
    const { ownerId, schoolId, amount, reason } = req.body;
    const expends = await prisma.owner_expense.create({
      data: {
        amount,
        reason,
        ownerId,
        schoolId,
      },
    });
    res.status(201).send(expends);
  } catch (error) {
    console.error("Add expense Error ", error);
    res.status(500).send(error);
  }
});
//create time slot
app.post("/add/time-slot", auth, async (req, res) => {
  try {
    const { start_time, end_time, OwnerId } = req.body;
    const time = await prisma.time_slot.create({
      data: { start_time, end_time, OwnerId },
    });
    res.status(201).json(time);
  } catch (error) {
    console.error(error);
    res.status(500).json("errror");
  }
});
//get list of time
app.get("/list-time-slots", auth, async (req, res) => {
  try {
    const timeSlots = await prisma.time_slot.findMany({
      include: {
        owner: true,
      },
    });

    res.status(200).json(timeSlots);
  } catch (e) {
    console.log(e);
    res.status(500).json({ error: "Error retrieving time slots" });
  }
});

//get state
app.get("/states", async (req, res) => {
  try {
    const state = await prisma.state.findMany();
    res.status(200).json(state);
  } catch (error) {
    console.log(error);
    res.json("error");
  }
});
//get city
app.get("/city", async (req, res) => {
  try {
    const city = await prisma.city.findMany();
    res.status(200).json(city);
  } catch (error) {
    console.log(error);
    res.json("error").status(400);
  }
});

//register learner
app.post("/learner/signup", async (req, res) => {
  try {
    const { name, email, password, number } = req.body;

    const existingUser = await prisma.learner.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.learner.create({
      data: {
        name,
        email,
        password: hashedPassword,
        number,
      },include:{purchased_course:true}
    });
    const token = jwt.sign({ user: newUser }, process.env.JWT_SECRET);

    res.status(201).json({ newUser, token });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Error registering user" });
  }
});

//login learner
app.post("/learner/login", async (req, res) => {
  try {
    const { name, password } = req.body;
    // Find the user with the provided username
    const user = await prisma.learner.findFirst({
      where: { name },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign({ user: user }, process.env.JWT_SECRET);

    res.json({ token, user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Error logging in" });
  }
});
//get school
app.get("/school", auth, async (req, res) => {
  const sort = req?.query?.sortBy;
  try {
    let schools = [];
    if (sort === "price") {
      schools = await prisma.school.findMany({
        include: {
          school_image: true,
          course: { include: { selected_vehical: true } },
          city: true,
          state: true,
        },
        orderBy: { course: { price: "asc" } }, // Sort by price in ascending order
      });
    } else {
      schools = await prisma.school.findMany({
        include: {
          school_image: true,
          course: { include: { selected_vehical: true } },
          city: true,
          state: true,
        },
      });
    }
    res.send(schools).status(200);
  } catch (e) {
    console.log("Error getting Schools", e);
    res.status(400).send("error");
  }
});
//specific school
app.get("/school/:id", auth, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const schools = await prisma.school.findFirst(
      { where: { id } },
      {
        include: {
          school_image: true,
          course: true,
          city: true,
          state: true,
          school_review: true,
        },
      }
    );
    res.send(schools).status(200);
  } catch (e) {
    console.log("Error getting Schools", e);
    res.status(400).send("error");
  }
});
//get car brand
app.get("/get/brand", auth, async (req, res) => {
  try {
    const brands = await prisma.car_Brand.findMany();
    res.json(brands).status(200);
  } catch (e) {
    console.log(e);
    res.send("Error").status(500);
  }
});
//get car model
app.get("/get/model", auth, async (req, res) => {
  try {
    const model = await prisma.car_model.findMany();
    res.json(model).status(200);
  } catch (e) {
    console.log(e);
    res.send("Error").status(500);
  }
});
//register trainer
app.post("/trainer/register", auth, async (req, res) => {
  try {
    const { name, email, password, number, salary, expiration, schoolId } =
      req.body;

    const existingUser = await prisma.trainer.findFirst({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.trainer.create({
      data: {
        name,
        email,
        password: hashedPassword,
        number,
        salary,
        expiration,
        schoolId,
      },
      include: { school: true },
    });
    res.json({ newUser }).status(200);
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Error registering user" });
  }
});
//trainer list
app.get("/get/trainers", auth, async (req, res) => {
  try {
    const listTrainer = await prisma.trainer.findMany();
    res.json(listTrainer).status(200);
  } catch (e) {
    console.log(e);
    res.send("Error").status(500);
  }
});
//login tariner
app.post("/trainer/login", async (req, res) => {
  try {
    const { name, password } = req.body;

    const user = await prisma.trainer.findFirst({
      where: { name },
      include: { school: true },
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Compare the provided password with the hashed password stored in the database
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    //  Generate JWT token
    const token = jwt.sign({ user: user }, process.env.JWT_SECRET);

    res.json({ token, user });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ error: "Error logging in" });
  }
});
//list of vehical with trainer
app.get("/listvehicals_trainer", auth, async (req, res) => {
  try {
    const vehicals = await prisma.vehical.findMany({
      include: {
        trainer: true,
        owner: true,
        model: { include: { Brand: true } },
      },
    });
    res.send(vehicals).status(200);
  } catch (e) {
    console.log(e);
    res.send("error").status(500);
  }
});
//add Vehical
app.post("/add/vehicals", auth, async (req, res) => {
  const { modelId, trainerId, ownerId } = req.body;
  try {
    const adVehical = await prisma.vehical.create({
      data: { modelId, trainerId, ownerId },
    });
    res.send(adVehical).status(201);
  } catch (error) {
    console.error(error);
    res.status(500).send("can't add vehical");
  }
});
//add Owner Expense
app.post("/owner/expense", auth, async (req, res) => {
  try {
    const { OwnerId, schoolId, amount, reason } = req.body;
    const addExpense =await prisma.owner_expense.create({
      data: {
        amount,
        reason,
        OwnerId,
        schoolId,
      },
    });
    res.status(201).json(addExpense);
  } catch (error) {
    console.error("Add expense Error ", error);
    res.status(500).send(error);
  }
});
//add Trainer Expense
app.post("/trainer/expense", auth, async (req, res) => {
  try {
    const { trainerId, schoolId, amount, reason } = req.body;
    const addExpense =await prisma.trainer_expense.create({
      data: {
        amount:amount,
        reason:reason,
        trainerID:trainerId,
        schoolId:schoolId,
      },
    });
    res.status(201).json(addExpense);
  } catch (error) {
    console.error("Add expense Error ", error);
    res.status(500).send(error);
  }
});
//trainer expense list for owner
app.get('/list/expense/:id',auth,async (req,res)=>{
  try{
    const id =parseInt(req.params.id) 
    const explist = await prisma.trainer_expense.findMany({where: {
      trainerID: id 
    }})
    res.send(explist).status(200)  
  }catch(e){
    console.log(e)
    res.send("error").status(500)
  }
  
})
//get trainer expense
app.get('/trainer/expense',auth,async (req,res)=>{
  try{
    const explist = await prisma.trainer_expense.findMany()
    res.send(explist).status(200)  
  }catch(e){
    console.log(e)
    res.send("error").status(500)
  }
})
//get owner expense
app.get('/owner/expense',auth,async (req,res)=>{
  try{
    const explist = await prisma.owner_expense.findMany()
    res.send(explist).status(200)  
  }catch(e){
    console.log(e)
    res.send("error").status(500)
  }
})
// Get total number of learners
app.get('/learners/total', auth,async (req, res) => {
  try {
    const totalLearners = await prisma.learner.findMany();
    res.json({ totalLearners });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of active learners
app.get('/learners/active',auth, async (req, res) => {
  try {
    const activeLearners = await prisma.learner.findMany({
      where: {
        purchased_course: {
          some: {}
        }
      }
    });
    res.json({ activeLearners });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/purchase',auth, async (req, res) => {
  try {
    const { learnerId, trainerId, courseId, totalPrice, timeSlot, vehicalId, paymentId } = req.body;

    // Create a new record for purchased course
    const purchasedCourse = await prisma.purchased_course.create({
      data: {
        learnerId:learnerId,
        trainerId:trainerId,
        courseId:courseId,
        totalPrice:totalPrice,
        timeSlot:timeSlot,
        vechical:vehicalId,
        paymentId:paymentId
      }
    });

    res.status(201).json({ message: 'Course purchased successfully', purchasedCourse });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//licence application
app.post('/licenses', auth,async (req, res) => {
  try {
    const { schoolId, learnerId, typeId, bloodGroupId, Fullname, fatherName, DOB, gender, photo, ageDocument, addressDoc } = req.body;
    
    const newLicense = await prisma.license.create({
      data: {
        schoolId,
        learnerId,
        typeId,
        bloodGroupId,
        Fullname,
        fatherName,
        DOB,
        gender,
        photo,
        ageDocument,
        addressDoc
      }
    });
    res.json(newLicense);
  } catch (error) {
    console.error("Error creating license:", error);
    res.status(500).json({ error: "An error occurred while creating the license" });
  }
});

//get licence type 
app.get('/getLicenceType',auth,async(req,res)=>{
  try{
    const licenseType = await prisma.licence_type.findMany()
    res.status(200).json(licenseType)
  }
  catch(e){
    console.log(e)
    res.send("error").status(500)
  }
})

app.get('/schools/:learnerId', async (req, res) => {
  const { learnerId } = parseInt(req.params.learnerId);
  try {
      const school =  await prisma.school_review.findFirst({
        where: {
          learnerId:learnerId
        },
        include: {
          school: {
            include: {
              state: true,
              city: true,
              school_image: true,
            },
          },
        },
      });
      if (!school) {
        return res.status(404).json({ error: 'School not found' });
      }
  
      res.json(school);
    }  catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
//school review
app.post("/school/review", auth, async (req, res) => {
  try{
    const review = await prisma.school_review.create({
      data: {
        schoolId: req.body.schoolId,
        learnerId: req.body.learnerId,
        rating: req.body.rating,
        review: req.body.review,
      }
    });
    res.send(review).status(201)
  }catch(e){
    console.log(e)
    res.send(e).status(500)
  }
});
//get cariculam
app.get('/learner/curriculam/:id',async(req,res)=>{
  const id =  parseInt(req.params.id);
  try {
      const curricula = await prisma.curriculum.findMany({
        where: {
          course: {
            purchased_course: {
              some: {
                learnerId:id,
              },
            },
          },
        },
        include: {
          course: true,
        },
      });
      res.json(curricula);
    } catch (error) {
      console.error('Error fetching curricula:', error);
      res.status(500).json({ error: 'Failed to fetch curricula' });
    }
  });

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
