import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";

(async () => {
  try {
    const snap = await getDocs(collection(db, "churches"));
    console.log("Church docs:", snap.size);
    console.log("Firebase connection successful!");
  } catch (error) {
    console.error("Firebase connection error:", error);
  }
})();
