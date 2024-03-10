import DockerClient from "dockerode";
import fs from "fs";
import path from "path";
import tar from "tar";
import ignore from "../ignore";
import {currentContext} from "../../app";
import {ServiceEngine} from "../engine";

export default function (client: DockerClient): ServiceEngine['build'] {
    return async (buildDir, volumeDir, {ram, cpu, disk, port, ports, env}) => {
        if (!fs.existsSync(process.cwd() + '/archives')) {
            fs.mkdirSync(process.cwd() + '/archives');
        }
        const archive = process.cwd() + '/archives/' + path.basename(buildDir) + '.tar';
        if (fs.existsSync(archive)) {
            fs.unlinkSync(archive);
        }
        await tar.c({
            gzip: false,
            file: archive,
            cwd: buildDir
        }, [...ignore(buildDir)]);

        // Populate env with built-in vars
        env.SERVICE_PORT = port.toString();
        env.SERVICE_PORTS = ports.join(' ');
        env.SERVICE_RAM = ram.toString();
        env.SERVICE_CPU = cpu.toString();
        env.SERVICE_DISK = disk.toString();

        const imageTag = path.basename(buildDir) + ':' + path.basename(volumeDir);

        // Build image
        const stream = await client.buildImage(archive, {
            t: imageTag,
            buildargs: env,
        });
        try {
            await new Promise((resolve, reject) => {
                client.modem.followProgress(stream, (err, res) => {
                    if (err) {
                        reject(err);
                    } else {
                        for (const r of res) {
                            if (r.errorDetail) {
                                reject(r.errorDetail.message);
                                return;
                            } else {
                                currentContext.logger.info(r.stream?.trim());
                            }
                        }
                        resolve(res);
                    }
                })
            });
        } catch (e) {
            currentContext.logger.error(e);
            return null;
        }
        fs.unlinkSync(archive);
        let container: DockerClient.Container;
        try {
            // Create container
            container = await client.createContainer({
                Image: imageTag,
                Labels: {
                    'nsm': 'true',
                    'nsm.id': path.basename(buildDir),
                    'nsm.buildDir': buildDir,
                    'nsm.volumeDir': volumeDir,
                },
                HostConfig: {
                    Memory: ram,
                    CpuShares: cpu,
                    PortBindings: {
                        [port + '/tcp']: [{HostPort: `${port}`}]
                    },
                    DiskQuota: disk,
                    //Binds: [`${volumeDir}:/service`] // Mount volume
                },
                Env: Object.entries(env).map(([k, v]) => `${k}=${v}`),
                ExposedPorts: {
                    [port]: {}
                },
            });
            await container.start();
        } catch (e) {
            if (!container) {
                await client.getImage(imageTag).remove({ force: true });
            }
            throw e;
        }
        return container.id;
    }
}