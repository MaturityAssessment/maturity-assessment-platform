import LoginForm from "./LoginForm";

const Login = ({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) => {
  const status = searchParams?.status;
  const registrationSubmitted =
    (Array.isArray(status) ? status[0] : status) === "registration-submitted";

  return (
    <div className="flex items-center justify-center h-screen">
      <LoginForm registrationSubmitted={registrationSubmitted} />
    </div>
  );
};

export default Login;
