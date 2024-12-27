import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// const firebaseConfig = {
//   apiKey:,
//   authDomain: ,
//   projectId:,
//   storageBucket:,
//   messagingSenderId:,
//   appId:,
// };

const sections = ["addCard", "addExpense", "viewExpenses"];
const registerBtn = document.querySelector("#register");
const loginBtn = document.querySelector("#login");
const addCardBtn = document.querySelector("#addCard");

const addCardLink = document.querySelector("#addCardLink");
const addExpenseLink = document.querySelector("#addExpenseLink");
const viewExpenseLink = document.querySelector("#viewExpenseLink");
const logoutLink = document.querySelector("#logoutLink");

const addExpenseBtn = document.querySelector("#addExpenseBtn");
const viewExpenseCard = document.querySelector("#viewExpenseCard");

registerBtn.addEventListener("click", register);
loginBtn.addEventListener("click", login);
addCardBtn.addEventListener("click", addCard);

addCardLink.addEventListener("click", () => showSection("addCard"));
addExpenseLink.addEventListener("click", () => showSection("addExpense"));
viewExpenseLink.addEventListener("click", () => showSection("viewExpenses"));
logoutLink.addEventListener("click", logout);

addExpenseBtn.addEventListener("click", addExpense);
viewExpenseCard.addEventListener("click", fetchExpenses);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore(app);

async function register() {
  const name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const username = document.getElementById("regUsername").value;
  const password = document.getElementById("regPassword").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    await addDoc(collection(db, "users"), {
      uid: userCredential.user.uid,
      name,
      username,
      email,
    });
    setLoginPersistence();
    showLoggedInUI();
  } catch (error) {
    alert(error.message);
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    setLoginPersistence();
    showLoggedInUI();
  } catch (error) {
    alert(error.message);
  }
}

async function logout() {
  try {
    await signOut(auth);
    localStorage.removeItem("authExpiration");
    showLoggedOutUI();
  } catch (error) {
    alert(error.message);
  }
}

async function addCard() {
  const cardNumber = document.getElementById("cardNumber").value;
  const issuerBank = document.getElementById("issuerBank").value;
  const cardType = document.getElementById("cardType").value;

  try {
    await addDoc(collection(db, "cards"), {
      userId: auth.currentUser.uid,
      cardNumber,
      issuerBank,
      cardType,
      createdAt: new Date(),
    });
    alert("Card added successfully!");
    loadCards();
  } catch (error) {
    alert(error.message);
  }
}

async function addExpense() {
  const date = document.getElementById("expenseDate").value;
  const cardId = document.getElementById("expenseCard").value;
  const detail = document.getElementById("expenseDetail").value;
  const amount = document.getElementById("expenseAmount").value;

  try {
    await addDoc(collection(db, "expenses"), {
      userId: auth.currentUser.uid,
      cardId,
      date: new Date(date),
      detail,
      amount: Number(amount),
      paid: false,
      createdAt: new Date(),
    });
    alert("Expense added successfully!");
    if (
      document.getElementById("viewExpensesSection").style.display !== "none"
    ) {
      fetchExpenses();
    }
  } catch (error) {
    alert(error.message);
  }
}

async function markAsPaid(expenseId) {
  try {
    const expenseRef = doc(db, "expenses", expenseId);
    await updateDoc(expenseRef, { paid: true });
    fetchExpenses(); // Refresh the list
  } catch (error) {
    alert(error.message);
  }
}

async function fetchExpenses() {
  const cardId = document.getElementById("viewExpenseCard").value;
  const expensesList = document.getElementById("expensesList");
  expensesList.innerHTML = "";

  try {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const q = query(
      collection(db, "expenses"),
      where("userId", "==", auth.currentUser.uid),
      where("cardId", "==", cardId),
      where("date", ">=", lastMonth)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const expense = doc.data();
      const div = document.createElement("div");
      div.className = "p-4 border-b";
      div.innerHTML = `
                        <div class="flex justify-between items-center">
                            <div>
                                <p class="font-bold">${expense.detail}</p>
                                <p class="text-sm text-gray-600">${expense.date
                                  .toDate()
                                  .toLocaleDateString()}</p>
                                <p class="text-lg">INR ${expense.amount}</p>
                            </div>
                            ${
                              !expense.paid
                                ? `<button onclick="markAsPaid('${doc.id}')" 
                                    class="bg-green-500 text-white px-4 py-2 rounded">
                                    Mark as Paid
                                </button>`
                                : '<span class="text-green-500">Paid</span>'
                            }
                        </div>
                    `;
      expensesList.appendChild(div);
    });
  } catch (error) {
    console.log(error.message);
    // alert(error.message);
  }
}

async function loadCards() {
  const cardSelectors = ["expenseCard", "viewExpenseCard"];

  try {
    const q = query(
      collection(db, "cards"),
      where("userId", "==", auth.currentUser.uid)
    );
    const querySnapshot = await getDocs(q);

    cardSelectors.forEach((selectorId) => {
      const select = document.getElementById(selectorId);
      select.innerHTML = '<option value="">Select a card</option>';

      querySnapshot.forEach((doc) => {
        const card = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${card.issuerBank} - ${card.cardNumber}`;
        select.appendChild(option);
      });
    });
  } catch (error) {
    alert(error.message);
  }
}

function setLoginPersistence() {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  localStorage.setItem("authExpiration", Date.now() + thirtyDays);
}

function showSection(section) {
  sections.forEach((s) => {
    document.getElementById(`${s}Section`).style.display = "none";
  });
  document.getElementById(`${section}Section`).style.display = "block";

  if (section === "addExpense" || section === "viewExpenses") {
    loadCards();
  }
  if (section === "viewExpenses") {
    fetchExpenses();
  }
}

function showLoggedInUI() {
  document.getElementById("authSection").style.display = "none";
  document.getElementById("nav").style.display = "block";
  showSection("addCard");
}

function showLoggedOutUI() {
  document.getElementById("authSection").style.display = "block";
  document.getElementById("nav").style.display = "none";
  sections.forEach((s) => {
    document.getElementById(`${s}Section`).style.display = "none";
  });
}

// Check authentication status on load
const authExpiration = localStorage.getItem("authExpiration");
if (authExpiration && Date.now() < parseInt(authExpiration)) {
  showLoggedInUI();
} else {
  localStorage.removeItem("authExpiration");
  showLoggedOutUI();
}
