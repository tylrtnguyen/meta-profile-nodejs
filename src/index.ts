import axios, { AxiosResponse } from "axios";
import { URLSearchParams } from "url";
import "dotenv/config";
import * as fs from "fs";

const API_URL: string =
  "https://graph.facebook.com/v19.0/me?fields=id,name,last_name";

const LOG_FILE: string = "meta_log.txt";
const MAX_REQUEST_PER_DAY = 200;
const RETRY_DELAY_BASE = 1000;

let retryDelay = RETRY_DELAY_BASE;
let remainingRequests = MAX_REQUEST_PER_DAY;

type MetaResponseType = {
  id: string;
  name: string;
  last_name: string;
};

type rateLimitInfoType = {
  call_count: number;
  total_time: number;
  total_cputime: number;
};

const logData = (data: string) => {
  try {
    fs.writeFileSync(LOG_FILE, data + "\n", { encoding: "utf8", flag: "a+" });
  } catch (err) {
    console.error(err);
  }
};

const fetchUserDataWithRateLimit = async (): Promise<void> => {
  try {
    const params = new URLSearchParams();
    params.append("access_token", process.env.META_TOKEN);

    const response: AxiosResponse = await axios.get(API_URL, { params });

    if (response.status === 200) {
      const data: MetaResponseType = response.data;
      const rateLimitInfo: string = response.headers["x-app-usage"];
      const parsedRateLimitInfo: rateLimitInfoType = JSON.parse(rateLimitInfo);
      logData(JSON.stringify(data));
      remainingRequests = MAX_REQUEST_PER_DAY - parsedRateLimitInfo.call_count;
      logData(
        `You've sent ${parsedRateLimitInfo.call_count}% of your ${MAX_REQUEST_PER_DAY} daily allowed requests`,
      );
      if (parsedRateLimitInfo.call_count == MAX_REQUEST_PER_DAY) {
        logData(`You're reached the limit number 200 request/day`);
        clearInterval(retryInterval);
      }
    }
  } catch (error) {
    if (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 429) {
          // 429: Too many request
          logData("Rate limit exceeded. Retrying...");
          retryWithBackOff();
        } else {
          logData("Error occurred: " + error.message);
        }
      }
    } else {
      logData("Error occurred: " + error);
    }
  }
};

const retryWithBackOff = (): void => {
  setTimeout(fetchUserDataWithRateLimit, retryDelay);
  retryDelay *= 2; // Exponential backoff
};

// Schedule initial request
const retryInterval = setInterval(fetchUserDataWithRateLimit, 2000);
