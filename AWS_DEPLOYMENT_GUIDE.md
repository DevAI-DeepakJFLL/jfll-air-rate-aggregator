# Complete AWS Free Tier Deployment & CI/CD Guide
### Jet Freight Logistics Rate Aggregator Tool (BOM Hub)
**100% Serverless Architecture: AWS S3 + CloudFront + AWS Lambda**

This step-by-step guide walks you through deploying the Rate Aggregator application to **Amazon Web Services (AWS)** using the **AWS Free Tier**, replicating the serverless architecture from the Cargo Booking Platform.

By deploying the FastAPI backend on **AWS Lambda** (instead of an EC2 virtual machine), you get **forever-free serverless compute** (1 million API requests free every month forever), zero server maintenance, no SSH key management, and an automated continuous deployment (CI/CD) pipeline that updates in seconds when you push to GitHub.

---

## Table of Contents
1. [Architecture Overview & Zero-Cost Breakdown](#1-architecture-overview--zero-cost-breakdown)
2. [Step 1: AWS Account Setup & Billing Guardrails](#step-1-aws-account-setup--billing-guardrails)
3. [Step 2: Deploy Frontend on AWS S3 & CloudFront](#step-2-deploy-frontend-on-aws-s3--cloudfront)
4. [Step 3: Deploy Backend on AWS Lambda (Serverless FastAPI)](#step-3-deploy-backend-on-aws-lambda-serverless-fastapi)
5. [Step 4: Create Dedicated Project IAM User for GitHub Actions](#step-4-create-dedicated-project-iam-user-for-github-actions)
6. [Step 5: Configure GitHub Secrets & Push-to-Deploy CI/CD](#step-5-configure-github-secrets--push-to-deploy-cicd)
7. [Step 6: End-to-End Verification Checklist](#step-6-end-to-end-verification-checklist)

---

## 1. Architecture Overview & Zero-Cost Breakdown

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DEVELOPER WORKFLOW                            │
│                                                                        │
│   git add .  ──►  git commit  ──►  git push origin main               │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ triggers
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     GITHUB ACTIONS CI/CD PIPELINE                      │
│                      (.github/workflows/deploy-aws.yml)                │
│                                                                        │
│   Job 1: Backend Deploy                  Job 2: Frontend Deploy        │
│   - Package FastAPI + dependencies       - npm run build (Static Out)  │
│   - Update AWS Lambda function code      - Sync frontend/out to S3     │
│   - Live in ~3 seconds                   - Invalidate CloudFront CDN   │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │ deploys                         │ deploys
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│          AWS LAMBDA                  │  │       AWS S3 + CLOUDFRONT    │
│      Serverless FastAPI Engine       │  │          Frontend Web App    │
│                                      │  │                              │
│   - Handler: lambda_handler.handler  │  │   - Next.js static bundle    │
│   - Mangum ASGI adapter              │  │   - Edge caching (<20ms)     │
│   - Built-in HTTPS Function URL      │  │   - Free HTTPS certificate   │
│   - 1 Million requests free/month    │  │   - 1 TB data transfer free  │
└──────────────────────────────────────┘  └──────────────────────────────┘
```

### Free Tier Limits Used:
| Service | Free Tier Allowance | Your Usage | Monthly Cost |
|---|---|---|---|
| **Amazon S3** | 5 GB Standard Storage | ~40 MB static assets | **$0.00** |
| **Amazon CloudFront** | 1 TB Data Transfer Out + 10,000,000 HTTPS requests/month (Forever Free) | ~1-5 GB | **$0.00** |
| **AWS Lambda** | 1,000,000 requests/month + 3,200,000 seconds compute (Forever Free) | ~10,000 requests/month | **$0.00** |
| **GitHub Actions** | 2,000 build minutes/month for free accounts | ~25 minutes/month | **$0.00** |

---

## Step 1: AWS Account Setup & Billing Guardrails

Before launching any resources, set up a zero-spend budget so AWS notifies you if anything ever approaches the Free Tier threshold.

### 1.1 Enable Billing Alerts
1. Log into the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, search for **Billing and Cost Management** and select it.
3. In the left navigation menu, click **Preferences** > **Billing preferences**.
4. Check both:
   - **Receive Free Tier Usage Alerts** (enter your email address)
   - **Receive Billing Alerts**
5. Click **Save preferences**.

### 1.2 Create a $1.00 USD Zero-Spend Budget
1. In the Billing Console left menu, click **Budgets** > **Create budget**.
2. Select **Zero spend budget** (or Cost budget with an amount of **$1.00**).
3. Under **Email recipients**, enter your personal email.
4. Click **Create budget**. AWS will automatically notify you if any unexpected charge occurs.

---

## Step 2: Deploy Frontend on AWS S3 & CloudFront

### 2.1 Create the S3 Bucket
1. Search for **S3** in the AWS console and open it.
2. Click **Create bucket**.
3. **Bucket name**: `jfll-rate-frontend` (or your company prefix if taken, e.g. `jfll-rate-frontend-prod`).
4. **AWS Region**: Select `ap-southeast-2` (or your preferred region, e.g., `ap-south-1`).
5. **Block Public Access**: 
   - Uncheck **Block all public access**.
   - Check the acknowledgement box *"I understand that the bucket will be public"*.
6. Click **Create bucket**.

### 2.2 Configure S3 Static Website Hosting
1. Click your newly created bucket name.
2. Go to the **Properties** tab.
3. Scroll down to **Static website hosting** and click **Edit**.
4. Select **Enable**.
5. **Index document**: type `index.html`.
6. **Error document**: type `index.html` (for Next.js client-side routing).
7. Click **Save changes**.

### 2.3 Set S3 Bucket Policy
1. Go to the **Permissions** tab of your bucket.
2. Under **Bucket policy**, click **Edit**.
3. Paste the following JSON policy (replace with your actual frontend bucket name if custom):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::jfll-rate-frontend/*"
    }
  ]
}
```

4. Click **Save changes**.

### 2.4 Create CloudFront CDN Distribution (HTTPS & Edge Caching)
1. Search for **CloudFront** in the AWS console and open it.
2. Click **Create distribution**.
3. **Origin domain**: Select your S3 bucket from the dropdown.
4. **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
5. **Allowed HTTP methods**: Select `GET, HEAD, OPTIONS`.
6. **Default root object**: Type `index.html`.
7. Scroll down and click **Create distribution**.
8. **Configure SPA Error Pages**:
   - Go to your distribution's **Error pages** tab > click **Create custom error response**.
   - HTTP error code: `403: Forbidden` > Response page path: `/index.html` > HTTP Response code: `200: OK`.
   - Create another custom error response for `404: Not Found` > Response page path: `/404.html` (or `/index.html`) > HTTP Response code: `200: OK`.
9. Note down your:
   - **Distribution ID** (e.g., `E1A2B3C4D5E6F7`)
   - **Distribution domain name** (e.g., `d12345abcdef.cloudfront.net`)

### 2.5 Add CloudFront URL Rewrite Function (Required for Next.js Clean Routes)
When using Next.js static export, pages are built as individual HTML files (`admin.html`, `admin/tariffs.html`, etc.). When visiting `/admin`, S3 looks for an object named `admin`, fails with 403, and falls back to `/index.html` (the calculator). A CloudFront Function resolves this instantly at the edge at zero cost (2 million requests/month free).

1. In the CloudFront console left menu, click **Functions**.
2. Click **Create function**.
3. **Name**: `jfll-url-rewrite`.
4. **Runtime**: Select `cloudfront-js-2.0`.
5. Click **Create function**.
6. In the **Build** tab code editor, paste the following code:

```javascript
function handler(event) {
    var request = event.request;
    var uri = request.uri;

    // 1. Root or trailing slash requests -> index.html
    if (uri.endsWith('/')) {
        request.uri += 'index.html';
    }
    // 2. Clean URLs without extension (e.g. /admin -> /admin.html)
    else if (!uri.includes('.')) {
        request.uri += '.html';
    }

    return request;
}
```

7. Click **Save changes**.
8. Click the **Publish** tab at the top, then click **Publish function**.
9. Under **Associated distributions**, click **Add association**:
   - **Distribution**: Select your distribution.
   - **Event type**: `Viewer request`.
   - **Cache behavior**: `Default (*)`.
   - Click **Add association**.

### 2.6 Create the Dedicated Private S3 Storage Bucket (Persistent PDFs & Tariffs)
To prevent uploaded airline PDF rate circulars and tariff data from ever being wiped when frontend code is deployed, create a separate private S3 storage bucket:
1. In the AWS S3 console, click **Create bucket**.
2. **Bucket name**: `jfll-rate-storage` (or your company prefix if taken, e.g. `jfll-rate-storage-prod`).
3. **AWS Region**: Select `ap-southeast-2` (matching your Lambda region).
4. **Block Public Access**: Keep **Block all public access** CHECKED.
   *(This guarantees confidential carrier buy rates and uploaded PDF circulars remain strictly private and accessible only through authorized backend API calls).*
5. Click **Create bucket**.

---

## Step 3: Deploy Backend on AWS Lambda (Serverless FastAPI)

We have created [lambda_handler.py](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Rate%20Aggregator%20Tool/backend/lambda_handler.py), a production Mangum ASGI adapter that runs your FastAPI application on AWS Lambda with zero code changes.

### 3.1 Create the Lambda Function in AWS Console
1. In the AWS console search bar, type **Lambda** and select **Lambda**.
2. Click **Create function**.
3. Choose **Author from scratch**.
4. **Function name**: `jfll-rate-api`.
5. **Runtime**: Select **Python 3.11** (or **Python 3.12**).
6. **Architecture**: Select **x86_64**.
7. Expand **Advanced settings**:
   - Check **Enable function URL** (provides direct, free HTTPS with zero API Gateway setup).
   - **Auth type**: Select **NONE** (public API).
   - Check **Configure cross-origin resource sharing (CORS)**.
     - Allow origins: `*`
     - Allow headers: `*`
     - Allow methods: `*`
8. Click **Create function**.
9. Once created, AWS will display your permanent **Function URL**:
   `https://abcdef1234567890.lambda-url.ap-south-1.on.aws/`

### 3.2 Configure Lambda Settings
1. Go to the **Configuration** tab of your function:
   - Click **General configuration** > **Edit**.
   - **Memory**: Set to **256 MB** (well within Free Tier limits).
   - **Timeout**: Set to **15 seconds**.
   - Click **Save**.
2. Under **Runtime settings** (at the bottom of the Code tab):
   - Click **Edit**.
   - **Handler**: Change to `lambda_handler.handler`.
   - Click **Save**.

### 3.3 Initial Code Upload
From your local terminal in the project root:

```bash
cd backend

# 1. Install Lambda dependencies locally into temporary folder
pip install --target ./lambda_pkg mangum fastapi uvicorn pydantic pydantic-settings sqlalchemy aiosqlite httpx python-multipart python-dotenv

# 2. Package into zip bundle
cd lambda_pkg
zip -r ../lambda-bundle.zip . -x "*__pycache__*" "*.dist-info/*"
cd ..
zip -g -r lambda-bundle.zip lambda_handler.py app data -x "*__pycache__*"

# 3. Upload to AWS Lambda
aws lambda update-function-code \
  --function-name jfll-rate-api \
  --zip-file fileb://lambda-bundle.zip \
  --region ap-south-1
```

*(Note: If you do not have the AWS CLI installed locally yet, you can upload `backend/lambda-bundle.zip` directly in the AWS Lambda Console by clicking **Upload from** > **.zip file**).*

### 3.4 Test the Live Lambda API
Open your browser or run:

```bash
curl https://YOUR_LAMBDA_URL.lambda-url.ap-south-1.on.aws/api/v1/health
```

You will receive:
```json
{
  "status": "ok",
  "app_name": "Jet Freight Rate Aggregator API"
}
```

---

## Step 4: Create Dedicated Project IAM User for GitHub Actions

Create a dedicated IAM user specifically for this project:

1. In the AWS console search bar, type **IAM** and open it.
2. In the left menu, click **Users** > **Create user**.
3. **User name**: `jfll-rate-aggregator-deployer`. Click **Next**.
4. In **Set permissions**, choose **Attach policies directly**.
5. Click **Create policy** > switch to **JSON** tab > paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3FrontendAndStorageAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::jfll-rate-frontend",
        "arn:aws:s3:::jfll-rate-frontend/*",
        "arn:aws:s3:::jfll-rate-storage",
        "arn:aws:s3:::jfll-rate-storage/*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Sid": "LambdaDeploy",
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:jfll-rate-api"
    }
  ]
}
```

*(Note: If your bucket names differ, update `jfll-rate-frontend` and `jfll-rate-storage` to match your exact bucket names)*

6. Name the policy `JFLLRateAggregatorDeployPolicy` and click **Create policy**.
7. Return to the user creation tab, attach `JFLLRateAggregatorDeployPolicy`, and finish creating the user.
8. Click on `jfll-rate-aggregator-deployer` > go to **Security credentials** tab > **Create access key**.
9. Select **Application running outside AWS** > click **Next** > **Create access key**.
10. Copy your **Access key ID** and **Secret access key**.

---

## Step 5: Configure GitHub Secrets & Push-to-Deploy CI/CD

### 5.1 Add Secrets to Your GitHub Repository
1. On GitHub, navigate to your repository: `https://github.com/DevAI-DeepakJFLL/jfll-air-rate-aggregator`.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Add the following under **Repository secrets** (or **Variables**):

| Name | Example Value | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIAVRDT7C7Q47OWNKND` | Access Key ID from Step 4 |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Secret Access Key from Step 4 |
| `AWS_REGION` | `ap-southeast-2` | AWS Region (matching your Lambda) |
| `AWS_S3_FRONTEND_BUCKET` | `jfll-rate-frontend` | Public frontend S3 bucket for website hosting |
| `AWS_S3_STORAGE_BUCKET` | `jfll-rate-storage` | Private S3 storage bucket for uploaded PDFs & tariff JSON |
| `AWS_S3_BUCKET_NAME` | `jfll-rate-frontend` | Backwards compatibility fallback if using single bucket |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | `E1A2B3C4D5E6F7` | CloudFront Distribution ID |
| `AWS_LAMBDA_FUNCTION_NAME` | `jfll-rate-api` | Your Lambda Function Name |
| `NEXT_PUBLIC_API_URL` | `https://xxxx.lambda-url.ap-southeast-2.on.aws` | Your Lambda Function URL |

### 5.2 The CI/CD Pipeline Workflow
The repository includes [.github/workflows/deploy-aws.yml](file:///Users/deepak/Development/Jet%20Freight%20Logistics/Rate%20Aggregator%20Tool/.github/workflows/deploy-aws.yml).

Every time you run `git push origin main`, GitHub Actions automatically:
1. Packages the FastAPI backend and installs dependencies.
2. Updates your AWS Lambda function in **~3 seconds**.
3. Builds the Next.js static production bundle with your Lambda API URL embedded.
4. Syncs static assets to S3 and purges the CloudFront edge cache.

---

## Step 6: End-to-End Verification Checklist

1. **Commit and Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: serverless AWS Lambda and S3 CloudFront CI/CD"
   git push origin main
   ```
2. **Watch the GitHub Actions Tab**:
   - Both jobs will execute:
     - **Deploy Backend to AWS Lambda**
     - **Build & Deploy Frontend to S3 + CloudFront**
3. **Verify the Live Application**:
   - Open your CloudFront URL: `https://YOUR_ID.cloudfront.net`
   - Test tariff search for BOM to DXB, 100 kg. The quote results will load directly via AWS Lambda!
