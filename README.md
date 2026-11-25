# CODLYTIC — Galaxy Portfolio

<p align="center">
  <strong>A cinematic digital universe for data, analytics and AI.</strong><br/>
  Explore the work and projects of Nitesh Kumar.
</p>

<p align="center">
  <a href="https://nitesh-datascience.github.io/portfolio/">Live Portfolio</a> ·
  <a href="https://github.com/Nitesh-Datascience">GitHub Profile</a> ·
  <a href="https://www.linkedin.com/in/niteshkumar-codlytic">LinkedIn</a>
</p>

---

## About

CODLYTIC is a responsive, galaxy-inspired portfolio that brings together Nitesh's interests in data analytics, Python, SQL, artificial intelligence and machine learning. The experience uses an animated solar-system visual, project highlights and an interactive portfolio guide.

## Highlights

- Animated galaxy atmosphere and CSS solar-system experience
- Responsive layout for desktop and mobile screens
- About section and skills/toolkit overview
- Featured analytics and machine-learning projects
- Interactive CODLYTIC AI portfolio guide powered by a Vercel serverless function and Gemini
- SEO metadata and social-sharing previews
- Social and contact links

## Featured projects

| Project | What it explores | Repository |
|---|---|---|
| **EduPro Learner Intelligence** | Learner segmentation, course recommendations and comparison of classification, regression and anomaly-detection models | [View project](https://github.com/Nitesh-Datascience/EduPro_Project) |
| **Customer Churn Intelligence** | Churn analysis and individual customer risk prediction | [View project](https://github.com/Nitesh-Datascience/Customer_churn_Prediction) |
| **Financial Fraud Detection** | Classification and anomaly-detection approaches, with evaluation limitations documented | [View project](https://github.com/Nitesh-Datascience/Financial_Fraud_Detection) |

## Tech and architecture

- **Frontend:** HTML, CSS and JavaScript
- **Visual experience:** CSS animations and a canvas-based star field
- **AI guide:** Vercel serverless API with Google's Gemini API
- **Hosting:** Static portfolio can be served from a static host; the AI guide requires the Vercel API deployment

## Run locally

1. Clone this repository:
   ```bash
   git clone https://github.com/Nitesh-Datascience/codlytic-galaxy-portfolio.git
   cd codlytic-galaxy-portfolio
   ```
2. Open `index.html` in a browser.

The portfolio's static experience runs without a build step. The AI guide needs the serverless API and a Gemini API key configured on the server.

## Deploy the AI guide on Vercel

1. Import this repository into Vercel and deploy the `main` branch.
2. In **Project Settings → Environment Variables**, add `GEMINI_API_KEY`.
3. Redeploy after adding or changing the variable.

The API function is `api/chat.js`. Keep the Gemini key in Vercel environment variables—never place it in browser-side code or commit it to this repository. The frontend can still be viewed without configuring the AI guide.

## Connect

- [LinkedIn](https://www.linkedin.com/in/niteshkumar-codlytic)
- [YouTube — CODLYTIC](https://youtube.com/@codlytic)
- [X](https://x.com/HeyNiteshh)
- [Instagram](https://www.instagram.com/codlytic/)
- [Facebook](https://www.facebook.com/share/1J7a5fWJVQ/)
- [GitHub](https://github.com/Nitesh-Datascience)
- [Email](mailto:ns0762005@gmail.com)

---

<p align="center">Built with curiosity by <strong>CODLYTIC</strong> ✦</p>
