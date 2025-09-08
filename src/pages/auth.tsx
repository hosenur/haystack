import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import Image from "next/image";
import * as React from "react";

const AuthPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="max-w-md w-full   p-8  rounded-3xl flex flex-col gap-4">
        <div className="flex justify-between">
          <Image
            src="/icon.png"
            width={100}
            height={100}
            className="mx- w-16"
            alt=""
          />
          <div>
            <h1 className="text-right font-semibold text-2xl">
              Continue To HayStack
            </h1>
            <p className="text- text-neutral-400">
              Manage your BookMarks with AI.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-4 my-4">
          <div className="col-span-12">
            <TextField label="Username" placeholder="Example: johnwick" />
          </div>
          <div className="col-span-12">
            <TextField label="Password" placeholder="Super Secret Password" />
          </div>
        </div>
        <Button type="submit">Continue</Button>
      </div>
    </div>
  );
};

export default AuthPage;
