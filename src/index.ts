import axios, { AxiosResponse } from "axios";
import { URLSearchParams } from "url";
import "dotenv/config";
import * as fs from "fs";

const API_URL: string =
  "https://graph.facebook.com/v19.0/me?fields=id,name,last_name";

const LOG_FILE: string = "meta_log.txt";

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

const fetchUserData = async () => {
  try {
    let params = new URLSearchParams();
    params.append("access_token", process.env.META_TOKEN);
    const response: AxiosResponse = await axios.get(API_URL, { params });
    if (response.status === 200) {
      const data: MetaResponseType = response.data;
      const rateLimitInfo: string = response.headers["x-app-usage"];
      const parsedRateLimitInfo: rateLimitInfoType = JSON.parse(rateLimitInfo);
      logData(JSON.stringify(data));
      logData(
        `You've sent ${parsedRateLimitInfo.call_count}% of your 200 daily allowed requests`
      );
      if (parsedRateLimitInfo.call_count == 100) {
        logData(`You're reached the limit number 200 request/day`);
        clearInterval(execution);
      }
    }
  } catch (err) {
    if (err) {
      console.error(err.response.type);
      console.error(err.response.code);
      console.error(err.response.message);
    }
    logData(JSON.stringify(err));
  }
};

const execution = setInterval(fetchUserData, 2000);
