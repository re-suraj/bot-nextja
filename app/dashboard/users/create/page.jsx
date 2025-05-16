import UserProfileForm from "@/components/users/UserProfileForm";

const page = () => {
  return (
    <div className="card w-full bg-base-100 shadow">
      <div className="card-body">
        <h2 className="card-title text-xl lg:text-3xl mb-3">
          Register New User
        </h2>
        <p className="text-base lg:text-lg">
          Create a user that can use this application to effectively managing
          their stocks / inventories within their warehouses.
        </p>
        <div className="divider my-5"></div>
        <UserProfileForm />
      </div>
    </div>
  );
};

export default page;
