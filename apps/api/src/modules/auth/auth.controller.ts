import { Controller, Get, UseGuards, Res, Req, Post } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { ApiTags, ApiExcludeController } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { UserData } from "@criminals/shared";
import type { Request, Response } from "express";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) { }

  @Get("discord")
  @UseGuards(AuthGuard("discord"))
  discordLogin() { }

  @Get("discord/callback")
  @UseGuards(AuthGuard("discord"))
  async discordCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as { token: string };
    const webUrl =
      this.configService.get<string>("WEB_URL") ??
      this.configService.get<string>("NEXT_PUBLIC_WEB_URL") ??
      "http://localhost:3000";

    res.cookie("access_token", user.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.redirect(`${webUrl}/dashboard`);
  }

  @Get("me")
  @UseGuards(AuthGuard("jwt"))
  async me(@CurrentUser() currentUser: { id: string }) {
    return this.authService.getUserById(currentUser.id);
  }

  @Post("logout")
  logout(@Res() res: Response) {
    const webUrl =
      this.configService.get<string>("WEB_URL") ??
      this.configService.get<string>("NEXT_PUBLIC_WEB_URL") ??
      "http://localhost:3000";
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return res.json({ success: true, redirect: webUrl });
  }
}
