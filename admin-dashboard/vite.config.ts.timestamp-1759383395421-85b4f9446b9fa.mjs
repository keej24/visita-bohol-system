// vite.config.ts
import { defineConfig } from "file:///C:/Users/Kejay/OneDrive/Desktop/visita-system/admin-dashboard/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Kejay/OneDrive/Desktop/visita-system/admin-dashboard/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\Kejay\\OneDrive\\Desktop\\visita-system\\admin-dashboard";
var vite_config_default = defineConfig(() => ({
  server: {
    host: "::",
    port: 8080
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip"
          ],
          "vendor-forms": [
            "react-hook-form",
            "@hookform/resolvers",
            "zod"
          ],
          "vendor-charts": ["recharts"],
          "vendor-firebase": [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage"
          ],
          "vendor-utils": [
            "clsx",
            "tailwind-merge",
            "class-variance-authority",
            "date-fns",
            "lucide-react"
          ],
          // App chunks
          "components-ui": [
            "./src/components/ui/button",
            "./src/components/ui/card",
            "./src/components/ui/input",
            "./src/components/ui/select",
            "./src/components/ui/dialog",
            "./src/components/ui/toast"
          ],
          "components-charts": ["./src/components/charts/ChartComponents"],
          "components-forms": ["./src/components/forms"],
          "components-filters": ["./src/components/filters"]
        }
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1e3,
    // Enable source maps for production debugging
    sourcemap: false,
    // Minimize CSS
    cssCodeSplit: true,
    // Enable minification
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        // Remove console.log in production
        drop_debugger: true
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "recharts"
    ]
  }
}));
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLZWpheVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXHZpc2l0YS1zeXN0ZW1cXFxcYWRtaW4tZGFzaGJvYXJkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxLZWpheVxcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXHZpc2l0YS1zeXN0ZW1cXFxcYWRtaW4tZGFzaGJvYXJkXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9LZWpheS9PbmVEcml2ZS9EZXNrdG9wL3Zpc2l0YS1zeXN0ZW0vYWRtaW4tZGFzaGJvYXJkL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCgpID0+ICh7XG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6IFwiOjpcIixcbiAgICBwb3J0OiA4MDgwLFxuICB9LFxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbiAgYnVpbGQ6IHtcbiAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgLy8gVmVuZG9yIGxpYnJhcmllc1xuICAgICAgICAgICd2ZW5kb3ItcmVhY3QnOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgJ3ZlbmRvci11aSc6IFtcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXNlbGVjdCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10b2FzdCcsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRvb2x0aXAnLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgJ3ZlbmRvci1mb3Jtcyc6IFtcbiAgICAgICAgICAgICdyZWFjdC1ob29rLWZvcm0nLFxuICAgICAgICAgICAgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLFxuICAgICAgICAgICAgJ3pvZCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAndmVuZG9yLWZpcmViYXNlJzogW1xuICAgICAgICAgICAgJ2ZpcmViYXNlL2FwcCcsXG4gICAgICAgICAgICAnZmlyZWJhc2UvYXV0aCcsXG4gICAgICAgICAgICAnZmlyZWJhc2UvZmlyZXN0b3JlJyxcbiAgICAgICAgICAgICdmaXJlYmFzZS9zdG9yYWdlJyxcbiAgICAgICAgICBdLFxuICAgICAgICAgICd2ZW5kb3ItdXRpbHMnOiBbXG4gICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnLFxuICAgICAgICAgICAgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eScsXG4gICAgICAgICAgICAnZGF0ZS1mbnMnLFxuICAgICAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgICAgICAgXSxcbiAgICAgICAgICAvLyBBcHAgY2h1bmtzXG4gICAgICAgICAgJ2NvbXBvbmVudHMtdWknOiBbXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy91aS9idXR0b24nLFxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvdWkvY2FyZCcsXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy91aS9pbnB1dCcsXG4gICAgICAgICAgICAnLi9zcmMvY29tcG9uZW50cy91aS9zZWxlY3QnLFxuICAgICAgICAgICAgJy4vc3JjL2NvbXBvbmVudHMvdWkvZGlhbG9nJyxcbiAgICAgICAgICAgICcuL3NyYy9jb21wb25lbnRzL3VpL3RvYXN0JyxcbiAgICAgICAgICBdLFxuICAgICAgICAgICdjb21wb25lbnRzLWNoYXJ0cyc6IFsnLi9zcmMvY29tcG9uZW50cy9jaGFydHMvQ2hhcnRDb21wb25lbnRzJ10sXG4gICAgICAgICAgJ2NvbXBvbmVudHMtZm9ybXMnOiBbJy4vc3JjL2NvbXBvbmVudHMvZm9ybXMnXSxcbiAgICAgICAgICAnY29tcG9uZW50cy1maWx0ZXJzJzogWycuL3NyYy9jb21wb25lbnRzL2ZpbHRlcnMnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICAvLyBPcHRpbWl6ZSBjaHVuayBzaXplIHdhcm5pbmdzXG4gICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxMDAwLFxuICAgIC8vIEVuYWJsZSBzb3VyY2UgbWFwcyBmb3IgcHJvZHVjdGlvbiBkZWJ1Z2dpbmdcbiAgICBzb3VyY2VtYXA6IGZhbHNlLFxuICAgIC8vIE1pbmltaXplIENTU1xuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcbiAgICAvLyBFbmFibGUgbWluaWZpY2F0aW9uXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICB0ZXJzZXJPcHRpb25zOiB7XG4gICAgICBjb21wcmVzczoge1xuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsIC8vIFJlbW92ZSBjb25zb2xlLmxvZyBpbiBwcm9kdWN0aW9uXG4gICAgICAgIGRyb3BfZGVidWdnZXI6IHRydWUsXG4gICAgICB9LFxuICAgIH0sXG4gIH0sXG4gIC8vIE9wdGltaXplIGRlcGVuZGVuY2llc1xuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnZmlyZWJhc2UvYXBwJyxcbiAgICAgICdmaXJlYmFzZS9hdXRoJyxcbiAgICAgICdmaXJlYmFzZS9maXJlc3RvcmUnLFxuICAgICAgJ2ZpcmViYXNlL3N0b3JhZ2UnLFxuICAgICAgJ3JlY2hhcnRzJyxcbiAgICBdLFxuICB9LFxufSkpO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1WCxTQUFTLG9CQUFvQjtBQUNwWixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBRmpCLElBQU0sbUNBQW1DO0FBS3pDLElBQU8sc0JBQVEsYUFBYSxPQUFPO0FBQUEsRUFDakMsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sTUFBTTtBQUFBLEVBQ1I7QUFBQSxFQUNBLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxlQUFlO0FBQUEsTUFDYixRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUE7QUFBQSxVQUVaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxhQUFhO0FBQUEsWUFDWDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsZ0JBQWdCO0FBQUEsWUFDZDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsaUJBQWlCLENBQUMsVUFBVTtBQUFBLFVBQzVCLG1CQUFtQjtBQUFBLFlBQ2pCO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBLFVBQ0EsZ0JBQWdCO0FBQUEsWUFDZDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUVBLGlCQUFpQjtBQUFBLFlBQ2Y7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxVQUNBLHFCQUFxQixDQUFDLHlDQUF5QztBQUFBLFVBQy9ELG9CQUFvQixDQUFDLHdCQUF3QjtBQUFBLFVBQzdDLHNCQUFzQixDQUFDLDBCQUEwQjtBQUFBLFFBQ25EO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsdUJBQXVCO0FBQUE7QUFBQSxJQUV2QixXQUFXO0FBQUE7QUFBQSxJQUVYLGNBQWM7QUFBQTtBQUFBLElBRWQsUUFBUTtBQUFBLElBQ1IsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBLFFBQ1IsY0FBYztBQUFBO0FBQUEsUUFDZCxlQUFlO0FBQUEsTUFDakI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBO0FBQUEsRUFFQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLEVBQUU7IiwKICAibmFtZXMiOiBbXQp9Cg==
