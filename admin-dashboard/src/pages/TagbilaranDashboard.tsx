/**

 * HOW IT WORKS:
 * This file is a WRAPPER. It doesn't contain the actual dashboard logic.
 * Instead, it:
 * 1. Imports the reusable OptimizedChanceryDashboard component
 * 2. Passes "tagbilaran" as the diocese parameter
 * 3. That component handles all the data loading and display
 * 

 */

import { OptimizedChanceryDashboard } from "@/pages/optimized/OptimizedChanceryDashboard";


const TagbilaranDashboard = () => {
  return <OptimizedChanceryDashboard diocese="tagbilaran" />;
};

export default TagbilaranDashboard;
