import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";
import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return {
    errors,
  };
};

export default function Auth() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <AppProvider embedded={false}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <h1 className={styles.loginTitle}>Welcome Back</h1>
            <p className={styles.loginSubtitle}>Sign in to your Shopify store to continue</p>
          </div>
          <Form method="post" className={styles.form}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Shop domain</label>
              <input
                className={`${styles.formInput} ${errors.shop ? styles.error : ""}`}
                name="shop"
                type="text"
                value={shop}
                onChange={(e) => setShop(e.currentTarget.value)}
                autoComplete="on"
                placeholder="example.myshopify.com"
              />
              {errors.shop && (
                <div className={styles.errorMessage}>
                  <span>{errors.shop}</span>
                </div>
              )}
              <div className={styles.formHint}>e.g. my-shop-domain.myshopify.com</div>
            </div>
            <button className={styles.submitButton} type="submit">
              Log in
            </button>
          </Form>
        </div>
      </div>
    </AppProvider>
  );
}
